package com.example.threedmodel.scheduler;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.threedmodel.entity.FileChunk;
import com.example.threedmodel.entity.FileInfo;
import com.example.threedmodel.mapper.FileChunkMapper;
import com.example.threedmodel.mapper.FileInfoMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class FileCleanupScheduler {

    @Autowired
    private FileInfoMapper fileInfoMapper;

    @Autowired
    private FileChunkMapper fileChunkMapper;

    @Value("${app.upload.temp-path}")
    private String tempPath;

    /**
     * 每小时执行一次清理（cron 表达式）
     */
    // @Scheduled(cron = "0 0 * * * ?")
    @Scheduled(initialDelay = 5000, fixedDelay = 3600000)
    public void cleanupUnusedFiles() {
        System.out.println("[FileCleanupScheduler] 开始执行未引用文件和过期分片清理...");
        LocalDateTime thresholdTime = LocalDateTime.now().minusHours(1);
        // LocalDateTime thresholdTime = LocalDateTime.now().minusHours(24);

        // 1. 清理过期分片（临时文件 + 数据库分片索引）
        cleanupExpiredChunks(thresholdTime);

        // 2. 清理无引用的文件（物理文件 + 数据库主记录）
        cleanupUnreferencedFiles(thresholdTime);
    }

    private void cleanupExpiredChunks(LocalDateTime thresholdTime) {
        try {
            LambdaQueryWrapper<FileChunk> wrapper = new LambdaQueryWrapper<>();
            wrapper.lt(FileChunk::getCreateAt, thresholdTime);
            List<FileChunk> oldChunks = fileChunkMapper.selectList(wrapper);

            if (!oldChunks.isEmpty()) {
                System.out.println("[FileCleanupScheduler] 发现 " + oldChunks.size() + " 个过期分片，开始清理...");
                for (FileChunk chunk : oldChunks) {
                    if (chunk.getChunkTempPath() != null) {
                        try {
                            Files.deleteIfExists(Paths.get(chunk.getChunkTempPath()));
                        } catch (IOException e) {
                            System.err.println("删除分片物理文件失败: " + chunk.getChunkTempPath() + ", error: " + e.getMessage());
                        }
                    }
                }
                // 批量清除数据库记录
                fileChunkMapper.delete(wrapper);
            }

            // 物理扫描 temp/chunk 目录下的所有子文件夹，彻底清除由于异常掉电或手动中断导致的空/残留脏文件夹
            Path chunkTempDir = Paths.get(tempPath);
            if (Files.exists(chunkTempDir)) {
                Files.list(chunkTempDir).forEach(uploadIdDir -> {
                    if (Files.isDirectory(uploadIdDir)) {
                        try {
                            // 判断目录的最后修改时间是否超过 24 小时
                            if (Files.getLastModifiedTime(uploadIdDir).toInstant().isBefore(
                                    thresholdTime.atZone(java.time.ZoneId.systemDefault()).toInstant())) {
                                // 递归强力删除
                                Files.walk(uploadIdDir)
                                     .sorted((p1, p2) -> p2.compareTo(p1)) // 先文件后目录
                                     .forEach(path -> {
                                         try {
                                             Files.deleteIfExists(path);
                                         } catch (IOException e) {
                                             System.err.println("强制清理过期临时路径失败: " + path + ", " + e.getMessage());
                                         }
                                     });
                                System.out.println("[FileCleanupScheduler] 强制清理过期临时目录: " + uploadIdDir);
                            }
                        } catch (IOException e) {
                            System.err.println("读取目录属性失败: " + uploadIdDir + ", " + e.getMessage());
                        }
                    }
                });
            }
        } catch (Exception e) {
            System.err.println("执行分片清理过程中发生异常: " + e.getMessage());
        }
    }

    private void cleanupUnreferencedFiles(LocalDateTime thresholdTime) {
        try {
            List<FileInfo> unreferenced = fileInfoMapper.selectUnreferencedFiles(thresholdTime);
            if (!unreferenced.isEmpty()) {
                System.out.println("[FileCleanupScheduler] 发现 " + unreferenced.size() + " 个无引用的过期物理文件，开始清理...");
                for (FileInfo file : unreferenced) {
                    // 删除物理文件 (主文件、转换后 GLB、生成缩略图)
                    deletePhysicalFile(file.getStoragePath());
                    deletePhysicalFile(file.getGlbConvertPath());
                    deletePhysicalFile(file.getThumbnailPath());

                    // 清理数据库记录
                    fileInfoMapper.deleteById(file.getId());
                    System.out.println("[FileCleanupScheduler] 成功清理 file_info 记录: ID=" + file.getId() + ", MD5=" + file.getFileMd5());
                }
            }
        } catch (Exception e) {
            System.err.println("执行无引用文件清理过程中发生异常: " + e.getMessage());
        }
    }

    private void deletePhysicalFile(String pathStr) {
        if (pathStr != null && !pathStr.trim().isEmpty()) {
            try {
                Path path = Paths.get(pathStr);
                boolean deleted = Files.deleteIfExists(path);
                if (deleted) {
                    System.out.println("[FileCleanupScheduler] 成功删除物理文件: " + pathStr);
                }
            } catch (Exception e) {
                System.err.println("[FileCleanupScheduler] 删除物理文件失败: " + pathStr + ", 错误原因: " + e.getMessage());
            }
        }
    }
}
