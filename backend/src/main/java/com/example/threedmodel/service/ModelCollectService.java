package com.example.threedmodel.service;

import com.example.threedmodel.entity.ModelCollect;
import com.example.threedmodel.event.ModelActionEvent;
import com.example.threedmodel.mapper.ModelCollectMapper;
import com.example.threedmodel.mapper.ModelMapper;
import com.example.threedmodel.entity.Model;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

 
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
public class ModelCollectService {

    @Autowired
    private ModelCollectMapper modelCollectMapper;

    @Autowired
    private ModelMapper modelMapper;

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
        event.setType("collect");
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
}
