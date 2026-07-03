package com.example.threedmodel.task;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.entity.ModelCollect;
import com.example.threedmodel.entity.ModelLike;
import com.example.threedmodel.mapper.ModelCollectMapper;
import com.example.threedmodel.mapper.ModelLikeMapper;
import com.example.threedmodel.mapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class ModelActionSyncTask {

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private ModelLikeMapper modelLikeMapper;

    @Autowired
    private ModelCollectMapper modelCollectMapper;

    @Autowired
    private ModelMapper modelMapper;

    // Redis Key 常量定义
    private static final String LIKE_KEY_PREFIX = "model:like:set:";
    private static final String CHANGED_LIKE_MODELS_KEY = "model:like:changed_models";

    private static final String COLLECT_KEY_PREFIX = "model:collect:set:";
    private static final String CHANGED_COLLECT_MODELS_KEY = "model:collect:changed_models";

    /**
     * 1. 点赞数据定时异步落库（每 30 秒执行一次）
     */
    @Scheduled(cron = "0/30 * * * * ?")
    @Transactional
    public void syncLikesToDatabase() {
        // 取出所有发生过变动的 modelId
        Set<String> changedModelIds = redisTemplate.opsForSet().members(CHANGED_LIKE_MODELS_KEY);
        if (changedModelIds == null || changedModelIds.isEmpty()) {
            return;
        }

        for (String modelIdStr : changedModelIds) {
            Long modelId = Long.valueOf(modelIdStr);
            String redisKey = LIKE_KEY_PREFIX + modelId;
            
            // 获取 Redis 中当前该模型的所有点赞用户
            Set<String> userIdsInRedis = redisTemplate.opsForSet().members(redisKey);
            if (userIdsInRedis == null) continue;

            int realLikeCount = 0;
            // 过滤掉占位符 -1，得到真正有效的 userId 列表
            List<Long> validUserIds = userIdsInRedis.stream()
                    .filter(id -> !"-1".equals(id))
                    .map(Long::valueOf)
                    .collect(Collectors.toList());

            for (Long userId : validUserIds) {
                realLikeCount++;
                // 如果数据库没有这条点赞记录，则插入
                Long count = modelLikeMapper.selectCount(new QueryWrapper<ModelLike>()
                        .eq("model_id", modelId).eq("user_id", userId));
                if (count == 0) {
                    ModelLike like = new ModelLike();
                    like.setModelId(modelId);
                    like.setUserId(userId);
                    like.setCreatedAt(LocalDateTime.now());
                    modelLikeMapper.insert(like);
                }
            }

            // 清理被取消的点赞（DB里有，但Redis里已经没有的记录）
            if (!validUserIds.isEmpty()) {
                modelLikeMapper.delete(new QueryWrapper<ModelLike>()
                        .eq("model_id", modelId)
                        .notIn("user_id", validUserIds));
            } else {
                // 如果没有一个有效用户点赞了，直接清空该模型在 DB 中的所有点赞记录
                modelLikeMapper.delete(new QueryWrapper<ModelLike>().eq("model_id", modelId));
            }

            // 同步更新主表 model 的总计数
            Model model = modelMapper.selectById(modelId);
            if (model != null) {
                model.setLikeCount(realLikeCount);
                modelMapper.updateById(model);
            }

            // 本次同步完成后，从“变更记账本”中移除该模型
            redisTemplate.opsForSet().remove(CHANGED_LIKE_MODELS_KEY, modelIdStr);
        }
    }

    /**
     * 2. 收藏数据定时异步落库（每 30 秒执行一次）
     */
    @Scheduled(cron = "0/30 * * * * ?")
    @Transactional
    public void syncCollectsToDatabase() {
        Set<String> changedModelIds = redisTemplate.opsForSet().members(CHANGED_COLLECT_MODELS_KEY);
        if (changedModelIds == null || changedModelIds.isEmpty()) {
            return;
        }

        for (String modelIdStr : changedModelIds) {
            Long modelId = Long.valueOf(modelIdStr);
            String redisKey = COLLECT_KEY_PREFIX + modelId;
            
            Set<String> userIdsInRedis = redisTemplate.opsForSet().members(redisKey);
            if (userIdsInRedis == null) continue;

            int realCollectCount = 0;
            List<Long> validUserIds = userIdsInRedis.stream()
                    .filter(id -> !"-1".equals(id))
                    .map(Long::valueOf)
                    .collect(Collectors.toList());

            for (Long userId : validUserIds) {
                realCollectCount++;
                Long count = modelCollectMapper.selectCount(new QueryWrapper<ModelCollect>()
                        .eq("model_id", modelId).eq("user_id", userId));
                if (count == 0) {
                    ModelCollect collect = new ModelCollect();
                    collect.setModelId(modelId);
                    collect.setUserId(userId);
                    collect.setCreatedAt(LocalDateTime.now());
                    modelCollectMapper.insert(collect);
                }
            }

            if (!validUserIds.isEmpty()) {
                modelCollectMapper.delete(new QueryWrapper<ModelCollect>()
                        .eq("model_id", modelId)
                        .notIn("user_id", validUserIds));
            } else {
                modelCollectMapper.delete(new QueryWrapper<ModelCollect>().eq("model_id", modelId));
            }

            Model model = modelMapper.selectById(modelId);
            if (model != null) {
                model.setCollectCount(realCollectCount);
                modelMapper.updateById(model);
            }

            redisTemplate.opsForSet().remove(CHANGED_COLLECT_MODELS_KEY, modelIdStr);
        }
    }
}