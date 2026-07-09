package com.example.threedmodel.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.threedmodel.dto.ModelCreateDTO;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.event.ModelPublishEvent;
//import com.example.threedmodel.mapper.ModelMainFileMapper;
import com.example.threedmodel.mapper.ModelMapper;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;


@Service
public class ModelService extends ServiceImpl<ModelMapper, Model> {
    @Autowired
    private ApplicationEventPublisher eventPublisher;

//    @Autowired
//    private ModelMainFileMapper modelMainFileMapper;  // 新增


    public Long publishModel(ModelCreateDTO dto) {

        Long authorId = dto.getAuthorId();
        if (authorId == null) {
            throw new IllegalArgumentException("authorId 不能为空");
        }
        
        Model model = new Model();
        model.setTitle(dto.getTitle());
        model.setDescription(dto.getDescription());
        model.setCategory(dto.getCategory());
        model.setTags(dto.getTags());
        model.setFileUrl(dto.getFileUrl());
        model.setThumbnailUrl(dto.getThumbnailUrl());
        model.setPreviewUrls(dto.getPreviewUrls());
        model.setShaderGraphJson(dto.getShaderGraphJson());
        model.setAuthorId(authorId);
        model.setLikeCount(0);
        model.setCollectCount(0);
        model.setCreatedAt(LocalDateTime.now());

        this.save(model);
// ⭐ 如果 DTO 中有 fileInfoId，则创建 model_main_file 关联
//        Long fileInfoId = dto.getFileInfoId();
//        if (fileInfoId != null) {
//            ModelMainFile relation = new ModelMainFile();
//            relation.setModelId(model.getId());
//            relation.setFileInfoId(fileInfoId);
//            relation.setCreateAt(LocalDateTime.now());
//            modelMainFileMapper.insert(relation);
//        }
        // 发布模型后，发布事件
        ModelPublishEvent event = new ModelPublishEvent();
        event.setAuthorId(authorId);
        event.setModelId(model.getId());
        eventPublisher.publishEvent(event);

        return model.getId();
    }


    public List<Model> getModelsByAuthor(Long authorId) {
        return this.lambdaQuery()
                .eq(Model::getAuthorId, authorId)
                .orderByDesc(Model::getCreatedAt)
                .list();
    }
}
