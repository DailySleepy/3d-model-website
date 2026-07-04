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
        // 从队列左侧弹出一个任务（非阻塞）
        Object task = redisTemplate.opsForList().leftPop(CONVERT_QUEUE);
        if (task != null) {
            String fileIdStr = task.toString();
            try {
                Long fileId = Long.parseLong(fileIdStr);
                // 异步执行转换
                processConvert(fileId);
            } catch (NumberFormatException e) {
                System.err.println("非法任务格式: " + fileIdStr);
            }
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