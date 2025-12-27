package com.example.threedmodel.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.threedmodel.dto.ModelDetailDTO;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.mapper.ModelMapper;
import com.example.threedmodel.service.ModelCollectService;
import com.example.threedmodel.service.ModelLikeService;
import com.example.threedmodel.service.UserService;
import com.example.threedmodel.utils.JwtUtil;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserService userService;

    /**
     * 从 JWT 中解析 userId（与 CommentController 保持一致）
     */
    private Long getUserIdFromRequest(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.toLowerCase().startsWith("bearer ")) {
            return null;
        }

        String token = authHeader.substring(7).trim();
        String username = jwtUtil.extractUsername(token);

        User user = userService.getOne(
                new QueryWrapper<User>().eq("username", username)
        );

        return user == null ? null : user.getId();
    }

    /**
     * 获取模型详情（含点赞 / 收藏状态）
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getModel(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        Model model = modelMapper.selectById(id);
        if (model == null) {
            return ResponseEntity.badRequest().body("模型不存在");
        }

        Long userId = getUserIdFromRequest(request);
        if (userId == null) {
            return ResponseEntity.badRequest().body("用户未登录或 Token 无效");
        }

        ModelDetailDTO dto = new ModelDetailDTO();
        dto.setId(model.getId());
        dto.setTitle(model.getTitle());
        dto.setDescription(model.getDescription());
        dto.setCategory(model.getCategory());
        dto.setTags(model.getTags());
        dto.setPreviewUrls(model.getPreviewUrls());
        dto.setFileUrl(model.getFileUrl());
        dto.setThumbnailUrl(model.getThumbnailUrl());

        dto.setLikeCount(model.getLikeCount() == null ? 0 : model.getLikeCount());
        dto.setCollectCount(model.getCollectCount() == null ? 0 : model.getCollectCount());

        dto.setLikedByUser(modelLikeService.isLiked(id, userId));
        dto.setCollectedByUser(modelCollectService.isCollected(id, userId));

        return ResponseEntity.ok(dto);
    }

    /**
     * 点赞 / 取消点赞
     */
    @PostMapping("/{id}/like")
    public ResponseEntity<?> toggleLike(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        Long userId = getUserIdFromRequest(request);
        if (userId == null) {
            return ResponseEntity.badRequest().body("用户未登录或 Token 无效");
        }

        modelLikeService.toggleLike(id, userId);
        return ResponseEntity.ok(getModel(id, request).getBody());
    }

    /**
     * 收藏 / 取消收藏
     */
    @PostMapping("/{id}/collect")
    public ResponseEntity<?> toggleCollect(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        Long userId = getUserIdFromRequest(request);
        if (userId == null) {
            return ResponseEntity.badRequest().body("用户未登录或 Token 无效");
        }

        modelCollectService.toggleCollect(id, userId);
        return ResponseEntity.ok(getModel(id, request).getBody());
    }
}
