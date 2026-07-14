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
import java.util.Collection;
import java.util.Map;
import java.util.stream.Collectors;
import java.nio.file.Paths;
import com.example.threedmodel.dto.ModelDetailDTO;
import com.example.threedmodel.vo.ModelVO;
import org.springframework.beans.factory.annotation.Value;


@Service
public class ModelService extends ServiceImpl<ModelMapper, Model> {
    @Value("${app.base-url}")
    private String baseUrl;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Autowired
    private ModelMainFileMapper modelMainFileMapper;

    @Autowired
    private ModelThumbnailFileMapper modelThumbnailFileMapper;

    @Autowired
    private ModelPreviewFileMapper modelPreviewFileMapper;

    @Autowired
    private ModelShaderGraphMapper modelShaderGraphMapper;

    @Autowired
    private ModelShaderTextureMapper modelShaderTextureMapper;


    @Transactional
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
        model.setAuthorId(authorId);
        model.setLikeCount(0);
        model.setCollectCount(0);
        model.setCreatedAt(LocalDateTime.now());

        this.save(model);

        // 1. 保存模型主文件关联
        Long fileInfoId = dto.getFileInfoId();
        if (fileInfoId != null) {
            ModelMainFile relation = new ModelMainFile();
            relation.setModelId(model.getId());
            relation.setFileInfoId(fileInfoId);
            relation.setCreateAt(LocalDateTime.now());
            modelMainFileMapper.insert(relation);
        }

        // 2. 保存模型缩略图关联
        Long thumbnailFileInfoId = dto.getThumbnailFileInfoId();
        if (thumbnailFileInfoId != null) {
            ModelThumbnailFile relation = new ModelThumbnailFile();
            relation.setModelId(model.getId());
            relation.setFileInfoId(thumbnailFileInfoId);
            relation.setCreateAt(LocalDateTime.now());
            modelThumbnailFileMapper.insert(relation);
        }

        // 3. 保存模型预览图关联
        List<Long> previewFileInfoIds = dto.getPreviewFileInfoIds();
        if (previewFileInfoIds != null && !previewFileInfoIds.isEmpty()) {
            for (int i = 0; i < previewFileInfoIds.size(); i++) {
                ModelPreviewFile relation = new ModelPreviewFile();
                relation.setModelId(model.getId());
                relation.setFileInfoId(previewFileInfoIds.get(i));
                relation.setSort(i);
                relation.setCreateAt(LocalDateTime.now());
                modelPreviewFileMapper.insert(relation);
            }
        }

        // 4. 保存 Shader Graph 节点配置
        String shaderGraphJson = dto.getShaderGraphJson();
        if (shaderGraphJson != null && !shaderGraphJson.trim().isEmpty()) {
            ModelShaderGraph relation = new ModelShaderGraph();
            relation.setModelId(model.getId());
            relation.setShaderGraphJson(shaderGraphJson);
            relation.setUpdateAt(LocalDateTime.now());
            modelShaderGraphMapper.insert(relation);
        }

        // 5. 保存 Shader 贴图文件关联
        List<Long> shaderTextureFileInfoIds = dto.getShaderTextureFileInfoIds();
        if (shaderTextureFileInfoIds != null && !shaderTextureFileInfoIds.isEmpty()) {
            for (Long textureFileInfoId : shaderTextureFileInfoIds) {
                ModelShaderTexture relation = new ModelShaderTexture();
                relation.setModelId(model.getId());
                relation.setFileInfoId(textureFileInfoId);
                relation.setCreateAt(LocalDateTime.now());
                modelShaderTextureMapper.insert(relation);
            }
        }

        // 发布模型后，发布事件
        ModelPublishEvent event = new ModelPublishEvent();
        event.setAuthorId(authorId);
        event.setModelId(model.getId());
        eventPublisher.publishEvent(event);

        return model.getId();
    }


    public List<ModelVO> getModelsByAuthor(Long authorId) {
        List<Model> list = this.lambdaQuery()
                .eq(Model::getAuthorId, authorId)
                .orderByDesc(Model::getCreatedAt)
                .list();
        return toVOList(list);
    }

    @Transactional
    public boolean deleteModel(Long id) {
        // 由于外键约束设置了 ON DELETE CASCADE，删除 models 主记录时数据库会自动级联清除对应的点赞、收藏、主文件、缩略图、预览图、Shader节点和评论关联，无需在此手动编写冗余的 delete 语句，从而减少了数据库的网络交互次数与冗余 SQL 执行性能。
        return this.removeById(id);
    }

    public ModelVO toVO(Model model) {
        if (model == null) return null;
        return toVOList(java.util.Collections.singletonList(model)).get(0);
    }

    public List<ModelVO> toVOList(Collection<Model> models) {
        if (models == null || models.isEmpty()) return java.util.Collections.emptyList();
        List<Long> modelIds = models.stream().map(Model::getId).collect(Collectors.toList());

        // 1. 批量查询主文件
        List<ModelMapper.ModelFileMapping> mainFiles = baseMapper.selectMainFiles(modelIds);
        Map<Long, String> mainFileMap = mainFiles.stream()
                .collect(Collectors.toMap(ModelMapper.ModelFileMapping::getModelId, m -> buildUrl("models", m.getStoragePath()), (a, b) -> a));

        // 2. 批量查询缩略图
        List<ModelMapper.ModelFileMapping> thumbnails = baseMapper.selectThumbnails(modelIds);
        Map<Long, String> thumbnailMap = thumbnails.stream()
                .collect(Collectors.toMap(ModelMapper.ModelFileMapping::getModelId, m -> buildUrl("images", m.getStoragePath()), (a, b) -> a));

        // 3. 批量查询预览图
        List<ModelMapper.ModelFileMapping> previews = baseMapper.selectPreviews(modelIds);
        Map<Long, List<String>> previewMap = previews.stream()
                .collect(Collectors.groupingBy(
                        ModelMapper.ModelFileMapping::getModelId,
                        Collectors.mapping(m -> buildUrl("images", m.getStoragePath()), Collectors.toList())
                ));

        // 4. 装配 ModelVO 列表
        return models.stream().map(model -> {
            ModelVO vo = new ModelVO();
            vo.setId(model.getId());
            vo.setTitle(model.getTitle());
            vo.setDescription(model.getDescription());
            vo.setCategory(model.getCategory());
            vo.setTags(model.getTags());
            vo.setAuthorId(model.getAuthorId());
            vo.setLikeCount(model.getLikeCount());
            vo.setCollectCount(model.getCollectCount());
            vo.setCreatedAt(model.getCreatedAt());

            vo.setFileUrl(mainFileMap.get(model.getId()));
            vo.setThumbnailUrl(thumbnailMap.get(model.getId()));
            List<String> previewList = previewMap.get(model.getId());
            if (previewList != null) {
                vo.setPreviewUrls(previewList.toArray(new String[0]));
            } else {
                vo.setPreviewUrls(new String[0]);
            }
            return vo;
        }).collect(Collectors.toList());
    }

    public ModelDetailDTO getModelDetail(Long id) {
        Model model = this.getById(id);
        if (model == null) return null;

        ModelVO vo = toVO(model);
        ModelDetailDTO dto = new ModelDetailDTO();
        dto.setId(vo.getId());
        dto.setAuthorId(vo.getAuthorId());
        dto.setTitle(vo.getTitle());
        dto.setDescription(vo.getDescription());
        dto.setCategory(vo.getCategory());
        dto.setTags(vo.getTags());
        dto.setFileUrl(vo.getFileUrl());
        dto.setThumbnailUrl(vo.getThumbnailUrl());
        dto.setPreviewUrls(vo.getPreviewUrls());
        dto.setLikeCount(vo.getLikeCount() == null ? 0 : vo.getLikeCount());
        dto.setCollectCount(vo.getCollectCount() == null ? 0 : vo.getCollectCount());

        // 获取主文件 ID
        ModelMainFile mainFile = modelMainFileMapper.selectOne(
                new LambdaQueryWrapper<ModelMainFile>().eq(ModelMainFile::getModelId, id)
        );
        if (mainFile != null) {
            dto.setFileInfoId(mainFile.getFileInfoId());
        }

        // ShaderGraph
        ModelShaderGraph shaderGraph = modelShaderGraphMapper.selectOne(
                new LambdaQueryWrapper<ModelShaderGraph>().eq(ModelShaderGraph::getModelId, model.getId())
        );
        if (shaderGraph != null) {
            dto.setShaderGraphJson(shaderGraph.getShaderGraphJson());
        }
        return dto;
    }

    private String buildUrl(String relativeDir, String storagePath) {
        if (storagePath == null || storagePath.isEmpty()) return "";
        String fileName = Paths.get(storagePath).getFileName().toString();
        return baseUrl + "/uploads/" + relativeDir + "/" + fileName;
    }
}
