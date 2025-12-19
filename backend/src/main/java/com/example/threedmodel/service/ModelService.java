package com.example.threedmodel.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.threedmodel.dto.ModelCreateDTO;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.event.ModelPublishEvent;
import com.example.threedmodel.mapper.ModelMapper;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;


@Service
public class ModelService extends ServiceImpl<ModelMapper, Model> {

    public Long publishModel(ModelCreateDTO dto) {

        Long authorId = 0L; //temporary
        
        Model model = new Model();
        model.setTitle(dto.getTitle());
        model.setDescription(dto.getDescription());
        model.setCategory(dto.getCategory());
        model.setTags(dto.getTags());
        model.setFileUrl(dto.getFileUrl());
        model.setThumbnailUrl(dto.getThumbnailUrl());
        model.setPreviewUrls(dto.getPreviewUrls());
        model.setAuthorId(authorId);
        model.setLikeCount(0);
        model.setCollectCount(0);
        model.setCreatedAt(LocalDateTime.now());

        this.save(model);
        // 发布模型后，发布事件
        ModelPublishEvent event = new ModelPublishEvent();
        event.setAuthorId(authorId);
        event.setModelId(model.getId());
        return model.getId();
    }


    public List<Model> getModelsByAuthor(Long authorId) {
        return this.lambdaQuery()
                .eq(Model::getAuthorId, authorId)
                .orderByDesc(Model::getCreatedAt)
                .list();
    }
}
