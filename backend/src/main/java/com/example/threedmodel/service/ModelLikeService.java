package com.example.threedmodel.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.entity.ModelLike;
import com.example.threedmodel.event.ModelActionEvent;
import com.example.threedmodel.mapper.ModelLikeMapper;
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
public class ModelLikeService {

    @Autowired
    private ModelLikeMapper modelLikeMapper;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private StringRedisTemplate redisTemplate;

    private static final String LIKE_KEY_PREFIX = "model:like:set:";
    private static final String CHANGED_MODELS_KEY = "model:like:changed_models";

    // 1. 点赞：只写 Redis Set，并向全局流水队列投递增量事件
    public void like(Long modelId, Long userId) {
        if (userId == null || modelId == null) return;
        String key = LIKE_KEY_PREFIX + modelId;
        
        // 往该模型的点赞 Set 集合里添加用户
        redisTemplate.opsForSet().add(key, String.valueOf(userId));
        
        // 【核心修改】将状态变更转化为“流水日志”推入 Redis 队列
        // 格式：modelId:userId:操作(LIKE/UNLIKE):业务类型(LIKE/COLLECT)
        String msg = modelId + ":" + userId + ":LIKE:LIKE";
        redisTemplate.opsForList().rightPush("model:action:queue", msg);

        // 保持你原有的事件通知（比如消息中心提醒）
        Model model = modelMapper.selectById(modelId);
        if (model != null) {
            ModelActionEvent event = new ModelActionEvent();
            event.setOperatorId(userId);
            event.setTargetUserId(model.getAuthorId());
            event.setModelId(modelId);
            event.setType("LIKE");
            eventPublisher.publishEvent(event);
        }
    }

    // 2. 取消点赞：只写 Redis Set，并向全局流水队列投递增量事件
    public void unlike(Long modelId, Long userId) {
        if (userId == null || modelId == null) return;
        String key = LIKE_KEY_PREFIX + modelId;
        
        // 从 Redis Set 中移除该用户
        redisTemplate.opsForSet().remove(key, String.valueOf(userId));
        
        // 【核心修改】推入取消点赞的流水日志
        String msg = modelId + ":" + userId + ":UNLIKE:LIKE";
        redisTemplate.opsForList().rightPush("model:action:queue", msg);
    }
    
    //3. 判断是否已点赞：先查 Redis，如果缓存不存在则触发全量预热
    public boolean isLiked(Long modelId, Long userId) {
    if (userId == null) return false;
    String key = LIKE_KEY_PREFIX + modelId;
    
    // 1. 判断缓存中是否存在该模型的整个点赞集合
    Boolean hasKey = redisTemplate.hasKey(key);
    if (Boolean.TRUE.equals(hasKey)) {
        // 缓存存在，直接 O(1) 复杂度去重查询，逻辑完全闭环
        return Boolean.TRUE.equals(redisTemplate.opsForSet().isMember(key, String.valueOf(userId)));
    }

    // 2. 缓存不存在（未初始化或已过期）：触发全量预热
    // 一次性查出给这个模型点过赞的所有用户 ID 列表
    List<ModelLike> allLikesInDb = modelLikeMapper.selectList(
            new QueryWrapper<ModelLike>().eq("model_id", modelId)
    );

    if (allLikesInDb != null && !allLikesInDb.isEmpty()) {
        // 把这些用户的 ID 全部塞进 Redis 的 Set 集合里
        String[] userIds = allLikesInDb.stream()
                .map(like -> String.valueOf(like.getUserId()))
                .toArray(String[]::new);
        redisTemplate.opsForSet().add(key, userIds);
    } else {
        // 如果数据库里也压根没人点赞，放入防穿透占位符 -1
        redisTemplate.opsForSet().add(key, "-1");
    }

    // 3. 【新增优化】为该缓存设置带有随机值的 TTL（防止缓存雪崩）
    // 基础过期时间 24 小时 + 0~30 分钟的随机扰动
    long timeout = 24 * 60 + new Random().nextInt(30); 
    redisTemplate.expire(key, Duration.ofMinutes(timeout));

    // 4. 全量装载完毕后，最终判定当前用户是否在这个集合中
    return Boolean.TRUE.equals(redisTemplate.opsForSet().isMember(key, String.valueOf(userId)));
}

    // 4. 获取点赞数：直接从 Redis 的 Set 长度获取，性能无敌
    public int getLikeCount(Long modelId) {
        String key = LIKE_KEY_PREFIX + modelId;
        Long size = redisTemplate.opsForSet().size(key);
        if (size != null && size > 0) {
            // 减去为了防穿透而放入的占位符 -1
            if (Boolean.TRUE.equals(redisTemplate.opsForSet().isMember(key, "-1"))) {
                return size.intValue() - 1;
            }
            return size.intValue();
        }
        Model model = modelMapper.selectById(modelId);
        return model == null || model.getLikeCount() == null ? 0 : model.getLikeCount();
    }

    // 保持你原有的 toggle 逻辑
    public boolean toggleLike(Long modelId, Long userId) {
        if (isLiked(modelId, userId)) {
            unlike(modelId, userId);
            return false;
        } else {
            like(modelId, userId);
            return true;
        }
    }

    // 保持原样不变即可
    public PageResultDTO<Model> getLikedModels(Long userId, int page, int size) {
        Page<ModelLike> likePage = modelLikeMapper.selectPage(
                new Page<>(page, size),
                new QueryWrapper<ModelLike>().eq("user_id", userId).orderByDesc("created_at")
        );
        List<ModelLike> likes = likePage.getRecords();
        if (likes.isEmpty()) return new PageResultDTO<>(List.of(), likePage.getTotal(), page, size);
        List<Long> modelIds = likes.stream().map(ModelLike::getModelId).collect(Collectors.toList());
        Map<Long, Model> modelMap = modelMapper.selectBatchIds(modelIds).stream()
                .collect(Collectors.toMap(Model::getId, model -> model, (a, b) -> a));
        List<Model> orderedModels = modelIds.stream().map(modelMap::get).filter(Objects::nonNull).collect(Collectors.toList());
        return new PageResultDTO<>(orderedModels, likePage.getTotal(), page, size);
    }
}