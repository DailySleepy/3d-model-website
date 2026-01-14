package com.example.threedmodel.service;

import com.example.threedmodel.entity.ModelLike;
import com.example.threedmodel.event.ModelActionEvent;
import com.example.threedmodel.mapper.ModelLikeMapper;
import com.example.threedmodel.mapper.ModelMapper;
import com.example.threedmodel.entity.Model;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.threedmodel.dto.PageResultDTO;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ModelLikeService {

    @Autowired
    private ModelLikeMapper modelLikeMapper;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Transactional
    public boolean toggleLike(Long modelId, Long userId) {
        if (isLiked(modelId, userId)) {
            unlike(modelId, userId);
            return false;
        } else {
            like(modelId, userId);
            return true;
        }
    }

    @Transactional
    public void like(Long modelId, Long userId) {
        ModelLike like = new ModelLike();
        like.setModelId(modelId);
        like.setUserId(userId);
        like.setCreatedAt(LocalDateTime.now());
        modelLikeMapper.insert(like);

        Model model = modelMapper.selectById(modelId);
        model.setLikeCount((model.getLikeCount() == null ? 0 : model.getLikeCount()) + 1);
        modelMapper.updateById(model);

        Long authorId = model.getAuthorId();
        ModelActionEvent event = new ModelActionEvent();
        event.setOperatorId(userId);
        event.setTargetUserId(authorId);
        event.setModelId(modelId);
        event.setType("LIKE");

        eventPublisher.publishEvent(event);
    }

    @Transactional
    public void unlike(Long modelId, Long userId) {
        modelLikeMapper.delete(new QueryWrapper<ModelLike>()
                .eq("model_id", modelId)
                .eq("user_id", userId));

        Model model = modelMapper.selectById(modelId);
        model.setLikeCount(Math.max((model.getLikeCount() == null ? 0 : model.getLikeCount()) - 1, 0));
        modelMapper.updateById(model);
    }

    public boolean isLiked(Long modelId, Long userId) {
        return modelLikeMapper.selectCount(new QueryWrapper<ModelLike>()
                .eq("model_id", modelId)
                .eq("user_id", userId)) > 0;
    }

    public int getLikeCount(Long modelId) {
        Model model = modelMapper.selectById(modelId);
        return model.getLikeCount() == null ? 0 : model.getLikeCount();
    }

    public PageResultDTO<Model> getLikedModels(Long userId, int page, int size) {
        Page<ModelLike> likePage = modelLikeMapper.selectPage(
                new Page<>(page, size),
                new QueryWrapper<ModelLike>()
                        .eq("user_id", userId)
                        .orderByDesc("created_at")
        );

        List<ModelLike> likes = likePage.getRecords();
        if (likes.isEmpty()) {
            return new PageResultDTO<>(List.of(), likePage.getTotal(), page, size);
        }

        List<Long> modelIds = likes.stream()
                .map(ModelLike::getModelId)
                .collect(Collectors.toList());

        Map<Long, Model> modelMap = modelMapper.selectBatchIds(modelIds).stream()
                .collect(Collectors.toMap(Model::getId, model -> model, (a, b) -> a));

        List<Model> orderedModels = modelIds.stream()
                .map(modelMap::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        return new PageResultDTO<>(orderedModels, likePage.getTotal(), page, size);
    }
}
