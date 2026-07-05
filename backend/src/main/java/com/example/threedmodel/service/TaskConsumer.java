package com.example.threedmodel.service;

import com.example.threedmodel.constants.ConvertStatus;
import com.example.threedmodel.entity.FileInfo;
import com.example.threedmodel.mapper.FileInfoMapper;
import com.example.threedmodel.utils.ConverterUtil; // 待实现
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class TaskConsumer {

    private static final String CONVERT_QUEUE = "task:model:convert";

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private FileInfoMapper fileInfoMapper;

    @Autowired
    private ConverterUtil converterUtil;

    /**
     * 定时轮询队列，每2秒执行一次
     */
    @Scheduled(fixedDelay = 2000)
    public void pollTask() {
        try {
            Object task = redisTemplate.opsForList().leftPop(CONVERT_QUEUE);
            if (task != null) {
                String fileIdStr = task.toString();
                try {
                    Long fileId = Long.parseLong(fileIdStr);
                    processConvert(fileId);  // 异步提交，但如果线程池满，CallerRunsPolicy 会让当前线程执行，不会抛出异常
                } catch (NumberFormatException e) {
                    System.err.println("非法任务格式: " + fileIdStr);
                } catch (Exception e) {
                    // 兜底捕获所有异常（包括 RejectedExecutionException 等）
                    System.err.println("处理任务失败: " + fileIdStr + ", 原因: " + e.getMessage());
                    // 可选：将任务重新放回队列或记录失败
                    // redisTemplate.opsForList().rightPush(CONVERT_QUEUE, task); // 重试（需防止死循环）
                }
            }
        } catch (Exception e) {
            // 捕获 pollTask 自身的异常（如 Redis 连接失败）
            System.err.println("轮询任务异常: " + e.getMessage());
        }
    }

    @Async("taskExecutor")
    public void processConvert(Long fileId) {
        System.out.println("开始处理转换任务: fileId=" + fileId + ", 线程=" + Thread.currentThread().getName());
        // 1. 查询文件信息
        FileInfo fileInfo = fileInfoMapper.selectById(fileId);
        if (fileInfo == null) {
            System.err.println("文件不存在: " + fileId);
            return;
        }

        // 2. 更新状态为处理中
        fileInfo.setConvertStatus(ConvertStatus.PROCESSING);
        fileInfo.setUpdateAt(LocalDateTime.now());
        fileInfoMapper.updateById(fileInfo);

        try {
            // 3. 执行格式转换（例如 obj -> glb）
            String glbPath = converterUtil.convertToGlb(fileInfo);
            // 4. 生成缩略图
            String thumbnailPath = converterUtil.generateThumbnail(fileInfo, glbPath);

            // 5. 更新 file_info
            fileInfo.setGlbConvertPath(glbPath);
            fileInfo.setThumbnailPath(thumbnailPath);
            fileInfo.setConvertStatus(ConvertStatus.SUCCESS);
            fileInfo.setUpdateAt(LocalDateTime.now());
            fileInfoMapper.updateById(fileInfo);

            System.out.println("转换任务完成: fileId=" + fileId);
        } catch (Exception e) {
            e.printStackTrace();
            // 6. 标记失败
            fileInfo.setConvertStatus(ConvertStatus.FAILED);
            fileInfo.setUpdateAt(LocalDateTime.now());
            fileInfoMapper.updateById(fileInfo);
            System.err.println("转换任务失败: fileId=" + fileId + ", 原因: " + e.getMessage());
        }
    }
}