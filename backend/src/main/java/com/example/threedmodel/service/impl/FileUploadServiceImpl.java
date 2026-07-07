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
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.channels.FileChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class FileUploadServiceImpl implements FileUploadService { // TODO: 兼容图片上传

    @Autowired
    private FileInfoMapper fileInfoMapper;

    @Autowired
    private FileChunkMapper fileChunkMapper;

    @Autowired
    private TaskProducer taskProducer;

    @Autowired
    private TransactionTemplate transactionTemplate;  // 新增：手动事务控制

    @Value("${app.file-root-path}")
    private String fileRootPath;

    @Value("${app.upload.temp-path}")
    private String tempPath;

    @Value("${app.upload.storage-path}")
    private String storagePath;

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${app.upload.chunk-size:5242880}")
    private long chunkSize;

    @Override
    public UploadInitResponse initUpload(UploadInitRequest request) {
        String fileMd5 = request.getFileMd5();
        UploadInitResponse response = new UploadInitResponse();
        response.setUploadId(fileMd5);

        LambdaQueryWrapper<FileInfo> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FileInfo::getFileMd5, fileMd5);
        FileInfo existing = fileInfoMapper.selectOne(wrapper);
        if (existing != null) {
            // 只有当储存路径存在且非空，且物理文件确实存在时，说明文件真正合并成功，可以进行秒传
            if (existing.getStoragePath() != null && !existing.getStoragePath().isEmpty()) {
                Path path = Paths.get(existing.getStoragePath());
                if (Files.exists(path)) {
                    response.setIsExist(true);
                    String url = baseUrl + "/uploads/models/" + path.getFileName().toString();
                    response.setFileUrl(url);
                    return response;
                } else {
                    // 物理文件不存在，重置存储路径，允许重新上传和合并
                    existing.setStoragePath("");
                    existing.setUpdateAt(LocalDateTime.now());
                    fileInfoMapper.updateById(existing);
                }
            }
            // 否则，说明此文件是之前上传中断、尚未合并的文件。
            // 此时不进行秒传，但返回已成功上传的分片索引列表，从而可以执行断点续传
            List<Integer> uploadedChunks = getUploadedChunks(fileMd5);
            response.setIsExist(false);
            response.setUploadedChunks(uploadedChunks);
            return response;
        }

        FileInfo newFile = new FileInfo();
        newFile.setFileMd5(fileMd5);
        newFile.setOriginalName(request.getFileName());
        newFile.setFileSize(request.getFileSize());
        String suffix = request.getFileName().substring(request.getFileName().lastIndexOf(".") + 1);
        newFile.setFileSuffix(suffix);
        newFile.setConvertStatus(0);
        newFile.setCreateAt(LocalDateTime.now());
        newFile.setUpdateAt(LocalDateTime.now());
        newFile.setStoragePath("");
        fileInfoMapper.insert(newFile);

        List<Integer> uploadedChunks = getUploadedChunks(fileMd5);
        response.setIsExist(false);
        response.setUploadedChunks(uploadedChunks);
        return response;
    }

    @Override
    @Transactional
    public UploadInitResponse uploadChunk(String uploadId, Integer chunkIndex, MultipartFile file) {
        LambdaQueryWrapper<FileChunk> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FileChunk::getFileMd5, uploadId)
                .eq(FileChunk::getChunkIndex, chunkIndex);
        FileChunk existing = fileChunkMapper.selectOne(wrapper);
        if (existing != null) {
            return buildStatusResponse(uploadId);
        }

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

    /**
     * 合并分片
     * - 移除 @Transactional，使用 TransactionTemplate 仅包裹 DB 更新
     * - 使用 FileChannel.transferTo 流式合并，避免内存溢出
     * - 事务提交后通过 TransactionSynchronization 投递任务
     * - 合并完成后清理临时分片文件
     */
    @Override
    public String mergeChunks(String uploadId) {
        // 1. 查询分片列表（无事务）
        LambdaQueryWrapper<FileChunk> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FileChunk::getFileMd5, uploadId)
                .orderByAsc(FileChunk::getChunkIndex);
        List<FileChunk> chunks = fileChunkMapper.selectList(wrapper);
        if (chunks.isEmpty()) {
            throw new RuntimeException("未找到任何分片");
        }

        // 2. 查询 fileInfo（无事务）
        FileInfo fileInfo = fileInfoMapper.selectOne(
                new LambdaQueryWrapper<FileInfo>().eq(FileInfo::getFileMd5, uploadId)
        );
        if (fileInfo == null) {
            throw new RuntimeException("文件信息不存在");
        }

        // 3. 构建最终存储路径
        String originalName = fileInfo.getOriginalName();
        String suffix = originalName.substring(originalName.lastIndexOf("."));
        String finalFileName = uploadId + "_" + System.currentTimeMillis() + suffix;
        Path finalPath = Paths.get(storagePath, "models", finalFileName);
        try {
            Files.createDirectories(finalPath.getParent());
        } catch (IOException e) {
            throw new RuntimeException("创建目录失败", e);
        }

        // 4. 使用 FileChannel.transferTo 合并分片（零拷贝，避免内存占用）
        try (FileChannel destination = FileChannel.open(finalPath,
                StandardOpenOption.CREATE, StandardOpenOption.WRITE)) {
            for (FileChunk chunk : chunks) {
                Path chunkPath = Paths.get(chunk.getChunkTempPath());
                try (FileChannel source = FileChannel.open(chunkPath, StandardOpenOption.READ)) {
                    // 定位到该分片在最终文件中的偏移量
                    long position = chunk.getChunkIndex() * chunkSize;
                    long remaining = source.size();
                    long transferred = 0;
                    // 循环确保完整传输（transferTo 不一定一次传完）
                    while (remaining > 0) {
                        long n = source.transferTo(transferred, remaining, destination);
                        transferred += n;
                        remaining -= n;
                    }
                    // 注意：destination 的 position 会自动前移，无需手动设置
                }
            }
        } catch (IOException e) {
            throw new RuntimeException("合并分片失败", e);
        }

        // 5. 事务内更新数据库 + 注册事务同步回调
        final String finalStoragePath = finalPath.toString();
        final Long fileId = fileInfo.getId();
        transactionTemplate.execute(status -> {
            FileInfo updateInfo = fileInfoMapper.selectById(fileId);
            if (updateInfo == null) {
                throw new RuntimeException("文件信息不存在");
            }
            updateInfo.setStoragePath(finalStoragePath);
            updateInfo.setConvertStatus(ConvertStatus.PENDING);
            updateInfo.setUpdateAt(LocalDateTime.now());
            fileInfoMapper.updateById(updateInfo);

            TransactionSynchronizationManager.registerSynchronization(
                    new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            taskProducer.sendConvertTask(fileId);
                            cleanChunksAsync(uploadId);
                        }
                    }
            );
            return null;
        });

        String url = baseUrl + "/uploads/models/" + finalFileName;
        return url;
    }

    // ---------- 辅助方法 ----------

    private List<Integer> getUploadedChunks(String fileMd5) {
        LambdaQueryWrapper<FileChunk> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(FileChunk::getFileMd5, fileMd5);
        List<FileChunk> chunks = fileChunkMapper.selectList(wrapper);
        
        List<FileChunk> validChunks = new java.util.ArrayList<>();
        for (FileChunk chunk : chunks) {
            if (chunk.getChunkTempPath() != null && Files.exists(Paths.get(chunk.getChunkTempPath()))) {
                validChunks.add(chunk);
            } else {
                // 物理切片文件丢失，删除数据库中的过期脏记录，以便前端可以重新上传该分片
                LambdaQueryWrapper<FileChunk> deleteWrapper = new LambdaQueryWrapper<>();
                deleteWrapper.eq(FileChunk::getFileMd5, fileMd5)
                        .eq(FileChunk::getChunkIndex, chunk.getChunkIndex());
                fileChunkMapper.delete(deleteWrapper);
            }
        }
        return validChunks.stream()
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

    /**
     * 异步清理临时分片文件
     * 使用独立线程执行，不阻塞主流程
     */
    private void cleanChunksAsync(String uploadId) {
        // 使用线程池或异步任务执行清理
        new Thread(() -> {
            try {
                Path chunkDir = Paths.get(tempPath, uploadId);
                if (Files.exists(chunkDir)) {
                    Files.walk(chunkDir)
                            .filter(Files::isRegularFile)
                            .forEach(path -> {
                                try {
                                    Files.delete(path);
                                } catch (IOException e) {
                                    System.err.println("删除分片文件失败: " + path);
                                }
                            });
                    Files.delete(chunkDir);
                    System.out.println("清理临时分片目录: " + chunkDir);

                    // 清理数据库中的分片记录
                    LambdaQueryWrapper<FileChunk> wrapper = new LambdaQueryWrapper<>();
                    wrapper.eq(FileChunk::getFileMd5, uploadId);
                    fileChunkMapper.delete(wrapper);
                }
            } catch (IOException e) {
                System.err.println("清理临时分片失败: " + e.getMessage());
            }
        }, "CleanChunks-" + uploadId).start();
    }
}