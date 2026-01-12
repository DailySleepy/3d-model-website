package com.example.threedmodel.service;

import com.example.threedmodel.entity.ModelCollect;
import com.example.threedmodel.event.ModelActionEvent;
import com.example.threedmodel.mapper.ModelCollectMapper;
import com.example.threedmodel.mapper.ModelMapper;
import com.example.threedmodel.entity.Model;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.threedmodel.dto.PageResultDTO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

 
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class ModelCollectService {

    @Autowired
    private ModelCollectMapper modelCollectMapper;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Transactional
    public boolean toggleCollect(Long modelId, Long userId) {
        if (isCollected(modelId, userId)) {
            uncollect(modelId, userId);
            return false;
        } else {
            collect(modelId, userId);
            return true;
        }
    }

    @Transactional
    public void collect(Long modelId, Long userId) {
        ModelCollect collect = new ModelCollect();
        collect.setModelId(modelId);
        collect.setUserId(userId);
        collect.setCreatedAt(LocalDateTime.now());
        modelCollectMapper.insert(collect);

        Model model = modelMapper.selectById(modelId);
        model.setCollectCount((model.getCollectCount() == null ? 0 : model.getCollectCount()) + 1);
        modelMapper.updateById(model);

        Long authorId = model.getAuthorId();
        ModelActionEvent event = new ModelActionEvent();
        event.setOperatorId(userId);
        event.setTargetUserId(authorId);
        event.setModelId(modelId);
        event.setType("COLLECT");

        eventPublisher.publishEvent(event);
    }

    @Transactional
    public void uncollect(Long modelId, Long userId) {
        modelCollectMapper.delete(new QueryWrapper<ModelCollect>()
                .eq("model_id", modelId)
                .eq("user_id", userId));

        Model model = modelMapper.selectById(modelId);
        model.setCollectCount(Math.max((model.getCollectCount() == null ? 0 : model.getCollectCount()) - 1, 0));
        modelMapper.updateById(model);
    }

    public boolean isCollected(Long modelId, Long userId) {
        return modelCollectMapper.selectCount(new QueryWrapper<ModelCollect>()
                .eq("model_id", modelId)
                .eq("user_id", userId)) > 0;
    }

    public int getCollectCount(Long modelId) {
        Model model = modelMapper.selectById(modelId);
        return model.getCollectCount() == null ? 0 : model.getCollectCount();
    }

    public PageResultDTO<Model> getCollectedModels(Long userId, int page, int size) {
        Page<ModelCollect> collectPage = modelCollectMapper.selectPage(
                new Page<>(page, size),
                new QueryWrapper<ModelCollect>()
                        .eq("user_id", userId)
                        .orderByDesc("created_at")
        );

        List<ModelCollect> collects = collectPage.getRecords();
        if (collects.isEmpty()) {
            return new PageResultDTO<>(List.of(), collectPage.getTotal(), page, size);
        }

        List<Long> modelIds = collects.stream()
                .map(ModelCollect::getModelId)
                .collect(Collectors.toList());

        Map<Long, Model> modelMap = modelMapper.selectBatchIds(modelIds).stream()
                .collect(Collectors.toMap(Model::getId, model -> model, (a, b) -> a));

        List<Model> orderedModels = modelIds.stream()
                .map(modelMap::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        return new PageResultDTO<>(orderedModels, collectPage.getTotal(), page, size);
    }
}
