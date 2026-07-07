package com.example.threedmodel.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.threedmodel.dto.ModelCreateDTO;
import com.example.threedmodel.entity.*;
import com.example.threedmodel.event.ModelPublishEvent;
import com.example.threedmodel.mapper.*;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;


@Service
public class ModelService extends ServiceImpl<ModelMapper, Model> {
    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private ModelLikeMapper modelLikeMapper;

    @Autowired
    private ModelCollectMapper modelCollectMapper;

    @Autowired
    private ModelMainFileMapper modelMainFileMapper;

    @Autowired
    private CommentMapper commentMapper;


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

    @Transactional
    public boolean deleteModel(Long id) {
        // 1. 删除点赞关系
        modelLikeMapper.delete(new LambdaQueryWrapper<ModelLike>().eq(ModelLike::getModelId, id));
        // 2. 删除收藏关系
        modelCollectMapper.delete(new LambdaQueryWrapper<ModelCollect>().eq(ModelCollect::getModelId, id));
        // 3. 删除主文件映射关系
        modelMainFileMapper.delete(new LambdaQueryWrapper<ModelMainFile>().eq(ModelMainFile::getModelId, id));
        // 4. 删除评论
        commentMapper.delete(new LambdaQueryWrapper<Comment>().eq(Comment::getModelId, id));
        // 5. 删除模型本身
        return this.removeById(id);
    }
}
