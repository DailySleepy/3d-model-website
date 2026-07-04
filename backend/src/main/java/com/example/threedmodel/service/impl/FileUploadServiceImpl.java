package com.example.threedmodel.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.threedmodel.constants.ConvertStatus;
import com.example.threedmodel.dto.UploadInitRequest;
import com.example.threedmodel.dto.UploadInitResponse;
import com.example.threedmodel.entity.FileChunk;
import com.example.threedmodel.entity.FileInfo;
import com.example.threedmodel.mapper.FileChunkMapper;
import com.example.threedmodel.mapper.FileInfoMapper;
import com.example.threedmodel.service.FileUploadService;
import com.example.threedmodel.service.TaskProducer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FileUploadServiceImpl implements FileUploadService {

    @Autowired
    private FileInfoMapper fileInfoMapper;

    @Autowired
    private FileChunkMapper fileChunkMapper;

    @Autowired
    private TaskProducer taskProducer;

    @Value("${app.file-root-path}")
    private String fileRootPath;

    @Value("${app.upload.temp-path}")
    private String tempPath;

    @Value("${app.upload.storage-path}")
    private String storagePath;

    @Value("${app.base-url}")
    private String baseUrl;

    // 分片大小（从配置读取，这里假设5MB）
    @Value("${app.upload.chunk-size:5242880}")
    private long chunkSize;

    @Override
    public UploadInitResponse initUpload(UploadInitRequest request) {
        String fileMd5 = request.getFileMd5();
        UploadInitResponse response = new UploadInitResponse();
        response.setUploadId(fileMd5);

        // 1. 检查是否已存在
        LambdaQueryWrapper<FileInfo> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FileInfo::getFileMd5, fileMd5);
        FileInfo existing = fileInfoMapper.selectOne(wrapper);
        if (existing != null) {
            response.setIsExist(true);
            // 生成访问URL（假设静态资源映射到 /uploads/）
            String url = baseUrl + "/uploads/models/" +
                    Paths.get(existing.getStoragePath()).getFileName().toString();
            response.setFileUrl(url);
            return response;
        }

        // 2. 新文件：插入 file_info 记录
        FileInfo newFile = new FileInfo();
        newFile.setFileMd5(fileMd5);
        newFile.setOriginalName(request.getFileName());
        newFile.setFileSize(request.getFileSize());
        String suffix = request.getFileName().substring(request.getFileName().lastIndexOf(".") + 1);
        newFile.setFileSuffix(suffix);
        newFile.setConvertStatus(0);
        newFile.setCreateAt(LocalDateTime.now());
        newFile.setUpdateAt(LocalDateTime.now());
        newFile.setStoragePath(""); //新增：临时占位
        // storagePath 稍后更新
        fileInfoMapper.insert(newFile);

        // 3. 查询已上传的分片（断点续传）
        List<Integer> uploadedChunks = getUploadedChunks(fileMd5);
        response.setIsExist(false);
        response.setUploadedChunks(uploadedChunks);
        return response;
    }

    @Override
    @Transactional
    public UploadInitResponse uploadChunk(String uploadId, Integer chunkIndex, MultipartFile file) {
        // 检查分片是否已经存在
        LambdaQueryWrapper<FileChunk> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FileChunk::getFileMd5, uploadId)
                .eq(FileChunk::getChunkIndex, chunkIndex);
        FileChunk existing = fileChunkMapper.selectOne(wrapper);
        if (existing != null) {
            // 已存在，直接返回当前已上传列表
            return buildStatusResponse(uploadId);
        }

        // 保存分片到临时目录
        try {
            String chunkTempPath = saveChunkToTemp(uploadId, chunkIndex, file);
            FileChunk chunk = new FileChunk();
            chunk.setFileMd5(uploadId);
            chunk.setChunkIndex(chunkIndex);
            chunk.setChunkSize(file.getSize());
            chunk.setChunkTempPath(chunkTempPath);
            chunk.setCreateAt(LocalDateTime.now());
            fileChunkMapper.insert(chunk);
        } catch (IOException e) {
            throw new RuntimeException("分片保存失败", e);
        }

        return buildStatusResponse(uploadId);
    }

    @Override
    @Transactional
    public String mergeChunks(String uploadId) {
        // 1. 查询所有分片（按索引排序）
        LambdaQueryWrapper<FileChunk> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FileChunk::getFileMd5, uploadId)
                .orderByAsc(FileChunk::getChunkIndex);
        List<FileChunk> chunks = fileChunkMapper.selectList(wrapper);
        if (chunks.isEmpty()) {
            throw new RuntimeException("未找到任何分片");
        }

        // 2. 构建最终存储路径（放在 /uploads/models/ 下）
        FileInfo fileInfo = fileInfoMapper.selectOne(
                new LambdaQueryWrapper<FileInfo>().eq(FileInfo::getFileMd5, uploadId)
        );
        if (fileInfo == null) {
            throw new RuntimeException("文件信息不存在");
        }
        String originalName = fileInfo.getOriginalName();
        String suffix = originalName.substring(originalName.lastIndexOf("."));
        String finalFileName = uploadId + "_" + System.currentTimeMillis() + suffix;
        Path finalPath = Paths.get(storagePath, "models", finalFileName);
        try {
            Files.createDirectories(finalPath.getParent());
        } catch (IOException e) {
            throw new RuntimeException("创建目录失败", e);
        }

        // 3. 合并分片
        try (RandomAccessFile raf = new RandomAccessFile(finalPath.toFile(), "rw")) {
            for (FileChunk chunk : chunks) {
                Path chunkPath = Paths.get(chunk.getChunkTempPath());
                byte[] bytes = Files.readAllBytes(chunkPath);
                raf.seek(chunk.getChunkIndex() * chunkSize);
                raf.write(bytes);
            }
        } catch (IOException e) {
            throw new RuntimeException("合并失败", e);
        }

        // 4. 更新 file_info 记录：状态设为 PENDING（0），表示待转换
        fileInfo.setStoragePath(finalPath.toString());
        fileInfo.setConvertStatus(ConvertStatus.PENDING);  // 使用常量，值为 0
        fileInfo.setUpdateAt(LocalDateTime.now());
        fileInfoMapper.updateById(fileInfo);

        // 5. 投递异步转换任务（格式转换 + 缩略图生成）
        taskProducer.sendConvertTask(fileInfo.getId());

        // 6. 清理临时分片（可选，建议用异步定时任务）
        // cleanChunks(uploadId);

        // 7. 返回文件ID（前端可用此ID轮询状态）
        return fileInfo.getId().toString();
    }

    // ---------- 辅助方法 ----------
    private List<Integer> getUploadedChunks(String fileMd5) {
        LambdaQueryWrapper<FileChunk> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FileChunk::getFileMd5, fileMd5)
                .select(FileChunk::getChunkIndex);
        return fileChunkMapper.selectList(wrapper).stream()
                .map(FileChunk::getChunkIndex)
                .collect(Collectors.toList());
    }

    private UploadInitResponse buildStatusResponse(String uploadId) {
        UploadInitResponse response = new UploadInitResponse();
        response.setUploadId(uploadId);
        response.setIsExist(false);
        response.setUploadedChunks(getUploadedChunks(uploadId));
        return response;
    }

    private String saveChunkToTemp(String uploadId, Integer chunkIndex, MultipartFile file) throws IOException {
        String chunkDir = tempPath + uploadId + "/";
        Path dir = Paths.get(chunkDir);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }
        String chunkFilePath = chunkDir + chunkIndex + ".part";
        file.transferTo(Paths.get(chunkFilePath));
        return chunkFilePath;
    }
}