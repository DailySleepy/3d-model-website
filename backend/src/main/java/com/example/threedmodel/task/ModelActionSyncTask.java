package com.example.threedmodel.task;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.entity.ModelLike;
import com.example.threedmodel.entity.ModelCollect;
import com.example.threedmodel.mapper.ModelLikeMapper;
import com.example.threedmodel.mapper.ModelCollectMapper;
import com.example.threedmodel.mapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

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

    private static final String QUEUE_KEY = "model:action:queue";
    private static final String LIKE_KEY_PREFIX = "model:like:set:";
    private static final String COLLECT_KEY_PREFIX = "model:collect:set:";

    @Scheduled(cron = "0/30 * * * * ?")
    @Transactional
    public void syncActionsToDatabase() {
        // 1. 每次最多拉取 1000 条混合流水
        List<String> rawActions = redisTemplate.opsForList().leftPop(QUEUE_KEY, 1000);
        if (rawActions == null || rawActions.isEmpty()) return;

        // 用两个 Set 记录哪些模型的点赞或收藏数发生了变化，以便后续统一刷新主表 count
        Set<Long> affectedLikeModelIds = new HashSet<>();
        Set<Long> affectedCollectModelIds = new HashSet<>();

        // 2. 顺序解析流水并安全执行 DB 增量操作
        for (String rawAction : rawActions) {
            String[] parts = rawAction.split(":");
            if (parts.length < 4) continue;

            Long modelId = Long.valueOf(parts[0]);
            Long userId = Long.valueOf(parts[1]);
            String action = parts[2];      // LIKE 或 UNLIKE
            String bizType = parts[3];     // LIKE 或 COLLECT

            if ("LIKE".equals(bizType)) {
                affectedLikeModelIds.add(modelId);
                if ("LIKE".equals(action)) {
                    Long count = modelLikeMapper.selectCount(new QueryWrapper<ModelLike>().eq("model_id", modelId).eq("user_id", userId));
                    if (count == 0) {
                        ModelLike like = new ModelLike();
                        like.setModelId(modelId);
                        like.setUserId(userId);
                        like.setCreatedAt(LocalDateTime.now());
                        modelLikeMapper.insert(like);
                    }
                } else {
                    modelLikeMapper.delete(new QueryWrapper<ModelLike>().eq("model_id", modelId).eq("user_id", userId));
                }
            } else if ("COLLECT".equals(bizType)) {
                affectedCollectModelIds.add(modelId);
                if ("LIKE".equals(action)) { // 在流水中，操作代表“加入集合”，即进行收藏
                    Long count = modelCollectMapper.selectCount(new QueryWrapper<ModelCollect>().eq("model_id", modelId).eq("user_id", userId));
                    if (count == 0) {
                        ModelCollect collect = new ModelCollect();
                        collect.setModelId(modelId);
                        collect.setUserId(userId);
                        collect.setCreatedAt(LocalDateTime.now());
                        modelCollectMapper.insert(collect);
                    }
                } else {
                    modelCollectMapper.delete(new QueryWrapper<ModelCollect>().eq("model_id", modelId).eq("user_id", userId));
                }
            }
        }

        // 3. 合并刷新涉及模型的 Count 计数，消除 N+1 数据库交互
        Set<Long> allAffectedModels = new HashSet<>();
        allAffectedModels.addAll(affectedLikeModelIds);
        allAffectedModels.addAll(affectedCollectModelIds);

        for (Long modelId : allAffectedModels) {
            Model model = modelMapper.selectById(modelId);
            if (model == null) continue;

            boolean needUpdate = false;

            // 刷新点赞数
            if (affectedLikeModelIds.contains(modelId)) {
                model.setLikeCount(getRealCount(LIKE_KEY_PREFIX + modelId, modelLikeMapper, modelId));
                needUpdate = true;
            }
            // 刷新收藏数
            if (affectedCollectModelIds.contains(modelId)) {
                model.setCollectCount(getRealCount(COLLECT_KEY_PREFIX + modelId, modelCollectMapper, modelId));
                needUpdate = true;
            }

            if (needUpdate) {
                modelMapper.updateById(model);
            }
        }
    }

    // 辅助方法：安全计算当前真实总数（防雪崩、防穿透占位符影响）
    private int getRealCount(String redisKey, Object mapper, Long modelId) {
        Boolean hasKey = redisTemplate.hasKey(redisKey);
        if (Boolean.TRUE.equals(hasKey)) {
            Long scard = redisTemplate.opsForSet().size(redisKey);
            Boolean hasNegative = redisTemplate.opsForSet().isMember(redisKey, "-1");
            return Boolean.TRUE.equals(hasNegative) ? (int) (scard - 1) : scard.intValue();
        } else {
            // 如果缓存由于 TTL 到期等原因刚好没了，直接去 DB 聚合当前真实总数，绝不产生脏数据
            if (mapper instanceof ModelLikeMapper) {
                return ((ModelLikeMapper) mapper).selectCount(new QueryWrapper<ModelLike>().eq("model_id", modelId)).intValue();
            } else {
                return ((ModelCollectMapper) mapper).selectCount(new QueryWrapper<ModelCollect>().eq("model_id", modelId)).intValue();
            }
        }
    }
}