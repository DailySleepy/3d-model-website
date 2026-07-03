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

    // 1. 收藏：只写 Redis
    public void collect(Long modelId, Long userId) {
        String key = COLLECT_KEY_PREFIX + modelId;
        redisTemplate.opsForSet().add(key, String.valueOf(userId));
        redisTemplate.opsForSet().add(CHANGED_MODELS_KEY, String.valueOf(modelId));

        // 触发事件通知
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

    // 2. 取消收藏：只写 Redis
    public void uncollect(Long modelId, Long userId) {
        String key = COLLECT_KEY_PREFIX + modelId;
        redisTemplate.opsForSet().remove(key, String.valueOf(userId));
        redisTemplate.opsForSet().add(CHANGED_MODELS_KEY, String.valueOf(modelId));
    }

    // 3. 检查是否收藏：先缓存后 DB
    public boolean isCollected(Long modelId, Long userId) {
        if (userId == null) return false;
        String key = COLLECT_KEY_PREFIX + modelId;
        
        Boolean hasKey = redisTemplate.hasKey(key);
        if (Boolean.TRUE.equals(hasKey)) {
            return Boolean.TRUE.equals(redisTemplate.opsForSet().isMember(key, String.valueOf(userId)));
        }

        boolean isCollectedInDb = modelCollectMapper.selectCount(new QueryWrapper<ModelCollect>()
                .eq("model_id", modelId)
                .eq("user_id", userId)) > 0;
        
        if (isCollectedInDb) {
            redisTemplate.opsForSet().add(key, String.valueOf(userId));
        } else {
            redisTemplate.opsForSet().add(key, "-1"); // 防穿透占位符
        }
        return isCollectedInDb;
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