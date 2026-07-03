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

    // 1. 点赞：只写 Redis，完全不碰 DB
    public void like(Long modelId, Long userId) {
        String key = LIKE_KEY_PREFIX + modelId;
        // 往该模型的点赞集合里添加用户
        redisTemplate.opsForSet().add(key, String.valueOf(userId));
        // 标记该模型发生了数据变更，通知定时任务
        redisTemplate.opsForSet().add(CHANGED_MODELS_KEY, String.valueOf(modelId));

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

    // 2. 取消点赞：只写 Redis
    public void unlike(Long modelId, Long userId) {
        String key = LIKE_KEY_PREFIX + modelId;
        redisTemplate.opsForSet().remove(key, String.valueOf(userId));
        redisTemplate.opsForSet().add(CHANGED_MODELS_KEY, String.valueOf(modelId));
    }

    // 3. 检查是否点赞：先查 Redis，若无则查询 DB 并回填（预热机制）
    public boolean isLiked(Long modelId, Long userId) {
        if (userId == null) return false;
        String key = LIKE_KEY_PREFIX + modelId;
        
        // 判断缓存中是否存在该 Key
        Boolean hasKey = redisTemplate.hasKey(key);
        if (Boolean.TRUE.equals(hasKey)) {
            return Boolean.TRUE.equals(redisTemplate.opsForSet().isMember(key, String.valueOf(userId)));
        }

        // 缓存失效或未初始化，去数据库查一次作为兜底，并回填到 Redis
        boolean isLikedInDb = modelLikeMapper.selectCount(new QueryWrapper<ModelLike>()
                .eq("model_id", modelId)
                .eq("user_id", userId)) > 0;
        
        if (isLikedInDb) {
            redisTemplate.opsForSet().add(key, String.valueOf(userId));
        } else {
            // 防止缓存穿透，可以放一个空值或者让它保持空 Set
            redisTemplate.opsForSet().add(key, "-1"); 
        }
        return isLikedInDb;
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