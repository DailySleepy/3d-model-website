package com.example.threedmodel.controller;

import com.example.threedmodel.dto.ModelDetailDTO;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.mapper.ModelMapper;
import com.example.threedmodel.service.ModelLikeService;
import com.example.threedmodel.service.ModelCollectService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/models")
public class ModelActionController {

    @Autowired
    private ModelLikeService modelLikeService;

    @Autowired
    private ModelCollectService modelCollectService;

    @Autowired
    private ModelMapper modelMapper;

    private Long getFakeUserId() {
        return 1001L;
    }

    // 获取模型信息（带点赞/收藏状态）
    @GetMapping("/{id}")
public ModelDetailDTO getModel(@PathVariable Long id) {
    Model model = modelMapper.selectById(id);
    if (model == null) return null;

    ModelDetailDTO dto = new ModelDetailDTO();
    dto.setId(model.getId());
    dto.setTitle(model.getTitle());
    dto.setDescription(model.getDescription());
    dto.setCategory(model.getCategory());

    // 直接映射 PostgreSQL character varying[] 到 String[]
    dto.setTags(model.getTags());               // model.tags 类型为 String[]
    dto.setPreviewUrls(model.getPreviewUrls());// model.previewUrls 类型为 String[]

    dto.setFileUrl(model.getFileUrl());
    dto.setThumbnailUrl(model.getThumbnailUrl());

    dto.setLikeCount(model.getLikeCount() == null ? 0 : model.getLikeCount());
    dto.setCollectCount(model.getCollectCount() == null ? 0 : model.getCollectCount());
    dto.setLikedByUser(modelLikeService.isLiked(id, getFakeUserId()));
    dto.setCollectedByUser(modelCollectService.isCollected(id, getFakeUserId()));

    return dto;
}


    // 切换点赞状态
    @PostMapping("/{id}/like")
    public ModelDetailDTO toggleLike(@PathVariable Long id) {
        modelLikeService.toggleLike(id, getFakeUserId());
        return getModel(id);
    }

    // 切换收藏状态
    @PostMapping("/{id}/collect")
    public ModelDetailDTO toggleCollect(@PathVariable Long id) {
        modelCollectService.toggleCollect(id, getFakeUserId());
        return getModel(id);
    }
}
