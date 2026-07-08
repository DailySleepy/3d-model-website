package com.example.threedmodel.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class TaskProducer {

    private static final String CONVERT_QUEUE = "task:model:convert";

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    /**
     * 投递转换任务
     * @param fileId file_info 表的主键 ID
     */
    public void sendConvertTask(Long fileId) {
        redisTemplate.opsForList().rightPush(CONVERT_QUEUE, fileId.toString());
        System.out.println("投递转换任务: fileId=" + fileId);
    }
}