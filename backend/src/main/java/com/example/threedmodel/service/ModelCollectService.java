package com.example.threedmodel.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.entity.ModelCollect;
import com.example.threedmodel.event.ModelActionEvent;
import com.example.threedmodel.mapper.ModelCollectMapper;
import com.example.threedmodel.mapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.time.Duration;

@Service
public class ModelCollectService {

    @Autowired
    private ModelCollectMapper modelCollectMapper;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final String COLLECT_KEY_PREFIX = "model:collect:set:";
    private static final String CHANGED_MODELS_KEY = "model:collect:changed_models";

    // 1. 收藏：只写 Redis Set，并向全局流水队列投递增量事件
    public void collect(Long modelId, Long userId) {
        if (userId == null || modelId == null) return;
        String key = COLLECT_KEY_PREFIX + modelId;
        
        // 往该模型的收藏 Set 集合里添加用户
        redisTemplate.opsForSet().add(key, String.valueOf(userId));
        
        // 【核心修改】推入收藏的流水日志
        // 格式：modelId:userId:操作(LIKE/UNLIKE):业务类型(LIKE/COLLECT)
        String msg = modelId + ":" + userId + ":LIKE:COLLECT";
        redisTemplate.opsForList().rightPush("model:action:queue", msg);

        // 保持你原有的事件通知（比如消息中心提醒）
        Model model = modelMapper.selectById(modelId);
        if (model != null) {
            ModelActionEvent event = new ModelActionEvent();
            event.setOperatorId(userId);
            event.setTargetUserId(model.getAuthorId());
            event.setModelId(modelId);
            event.setType("COLLECT");
            eventPublisher.publishEvent(event);
        }
    }

    // 2. 取消收藏：只写 Redis Set，并向全局流水队列投递增量事件
    public void uncollect(Long modelId, Long userId) {
        if (userId == null || modelId == null) return;
        String key = COLLECT_KEY_PREFIX + modelId;
        
        // 从 Redis Set 中移除该用户
        redisTemplate.opsForSet().remove(key, String.valueOf(userId));
        
        // 【核心修改】推入取消收藏的流水日志
        String msg = modelId + ":" + userId + ":UNLIKE:COLLECT";
        redisTemplate.opsForList().rightPush("model:action:queue", msg);
    }

    // 3. 检查是否收藏：先缓存后 DB
    public boolean isCollected(Long modelId, Long userId) {
        if (userId == null) return false;
        String key = COLLECT_KEY_PREFIX + modelId;
        
        // 1. 判断缓存中是否存在该模型的整个收藏集合
        Boolean hasKey = redisTemplate.hasKey(key);
        if (Boolean.TRUE.equals(hasKey)) {
            // 缓存存在，直接 O(1) 复杂度去重查询
            return Boolean.TRUE.equals(redisTemplate.opsForSet().isMember(key, String.valueOf(userId)));
        }

        // 2. 缓存不存在：触发【全量预热】，一次性查出给这个模型收藏过的所有用户 ID 列表
        List<ModelCollect> allCollectsInDb = modelCollectMapper.selectList(
                new QueryWrapper<ModelCollect>().eq("model_id", modelId)
        );

        if (allCollectsInDb != null && !allCollectsInDb.isEmpty()) {
            // 把这些用户的 ID 全部塞进 Redis 的 Set 集合里
            String[] userIds = allCollectsInDb.stream()
                    .map(collect -> String.valueOf(collect.getUserId()))
                    .toArray(String[]::new);
            redisTemplate.opsForSet().add(key, userIds);
        } else {
            // 如果数据库里也压根没人收藏，放入防穿透占位符 -1
            redisTemplate.opsForSet().add(key, "-1");
        }

        // 3. 设置带有随机值的 TTL（防止缓存雪崩）
        // 基础过期时间 24 小时 (1440分钟) + 0~30 分钟的随机扰动
        long timeout = 24 * 60 + new java.util.Random().nextInt(30); 
        redisTemplate.expire(key, Duration.ofMinutes(timeout));

        // 4. 全量装载完毕后，最终判定当前用户是否在这个集合中
        return Boolean.TRUE.equals(redisTemplate.opsForSet().isMember(key, String.valueOf(userId)));
    }

    // 4. 获取收藏数：直接查 Redis 集合大小
    public int getCollectCount(Long modelId) {
        String key = COLLECT_KEY_PREFIX + modelId;
        Long size = redisTemplate.opsForSet().size(key);
        if (size != null && size > 0) {
            if (Boolean.TRUE.equals(redisTemplate.opsForSet().isMember(key, "-1"))) {
                return size.intValue() - 1;
            }
            return size.intValue();
        }
        Model model = modelMapper.selectById(modelId);
        return model == null || model.getCollectCount() == null ? 0 : model.getCollectCount();
    }

    public boolean toggleCollect(Long modelId, Long userId) {
        if (isCollected(modelId, userId)) {
            uncollect(modelId, userId);
            return false;
        } else {
            collect(modelId, userId);
            return true;
        }
    }

    public PageResultDTO<Model> getCollectedModels(Long userId, int page, int size) {
        Page<ModelCollect> collectPage = modelCollectMapper.selectPage(
                new Page<>(page, size),
                new QueryWrapper<ModelCollect>().eq("user_id", userId).orderByDesc("created_at")
        );
        List<ModelCollect> collects = collectPage.getRecords();
        if (collects.isEmpty()) return new PageResultDTO<>(List.of(), collectPage.getTotal(), page, size);
        List<Long> modelIds = collects.stream().map(ModelCollect::getModelId).collect(Collectors.toList());
        Map<Long, Model> modelMap = modelMapper.selectBatchIds(modelIds).stream()
                .collect(Collectors.toMap(Model::getId, model -> model, (a, b) -> a));
        List<Model> orderedModels = modelIds.stream().map(modelMap::get).filter(Objects::nonNull).collect(Collectors.toList());
        return new PageResultDTO<>(orderedModels, collectPage.getTotal(), page, size);
    }
}