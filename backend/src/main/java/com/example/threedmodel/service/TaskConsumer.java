package com.example.threedmodel.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class TaskConsumer {

    private static final String CONVERT_QUEUE = "task:model:convert";

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private ConvertWorkerService convertWorkerService;  // 注入独立 Service

    @Scheduled(fixedDelay = 2000)
    public void pollTask() {
        try {
            Object task = redisTemplate.opsForList().leftPop(CONVERT_QUEUE);
            if (task != null) {
                String fileIdStr = task.toString();
                try {
                    Long fileId = Long.parseLong(fileIdStr);
                    // 调用独立 Service 的异步方法
                    convertWorkerService.processConvert(fileId);
                } catch (NumberFormatException e) {
                    System.err.println("非法任务格式: " + fileIdStr);
                } catch (Exception e) {
                    System.err.println("处理任务失败: " + fileIdStr + ", 原因: " + e.getMessage());
                }
            }
        } catch (Exception e) {
            System.err.println("轮询任务异常: " + e.getMessage());
        }
    }
}