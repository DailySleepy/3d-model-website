package com.example.threedmodel.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.threedmodel.dto.ModelCreateDTO;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.mapper.ModelMapper;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;



@Service
public class ModelService extends ServiceImpl<ModelMapper, Model> {

    public Long publishModel(ModelCreateDTO dto) {

        Model model = new Model();
        model.setTitle(dto.getTitle());
        model.setDescription(dto.getDescription());
        model.setCategory(dto.getCategory());
        model.setTags(dto.getTags());
        model.setFileUrl(dto.getFileUrl());
        model.setThumbnailUrl(dto.getThumbnailUrl());
        model.setPreviewUrls(dto.getPreviewUrls());
        model.setAuthorId(0L);//temporary
        model.setLikeCount(0);
        model.setCollectCount(0);
        model.setCreatedAt(LocalDateTime.now());

        this.save(model);

        return model.getId();
    }
}
