package com.example.threedmodel.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.threedmodel.dto.CommentCreateDTO;
import com.example.threedmodel.dto.CommentDTO;
import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.model.entity.User; // 修正User实体包路径（匹配常规项目结构）
import com.example.threedmodel.service.CommentService;
import com.example.threedmodel.service.UserService;
import com.example.threedmodel.utils.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Objects;

/**
 * 评论控制器（适配B站风格二级扁平结构）
 */
@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    /**
     * 公共方法：从请求头解析Token并获取当前登录用户ID
     */
    private Long getCurrentUserId(HttpServletRequest request) {
        // 1. 提取并清理Token
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.toLowerCase().startsWith("bearer ")) {
            throw new RuntimeException("未携带有效Token");
        }
        String token = authHeader.substring(7).trim();

        // 2. 解析用户名并查询用户
        String username = jwtUtil.extractUsername(token);
        User user = userService.getOne(new QueryWrapper<User>().eq("username", username));
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }
        return user.getId();
    }

    /**
     * 创建评论/回复（适配二级扁平结构：父评论ID+被回复用户ID绑定）
     */
    @PostMapping
    public ResponseEntity<CommentDTO> createComment(
            @Valid @RequestBody CommentCreateDTO dto,
            HttpServletRequest request
    ) {
        try {
            Long currentUserId = getCurrentUserId(request);
            CommentDTO comment = commentService.createComment(dto, currentUserId);
            return ResponseEntity.ok(comment);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    /**
     * 删除评论/回复（适配二级扁平结构：级联删除子评论）
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        try {
            Long currentUserId = getCurrentUserId(request);
            commentService.deleteComment(id, currentUserId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }

    /**
     * 分页查询模型的评论列表（核心适配：返回B站风格二级扁平结构）
     * 返回结构：一级评论列表，每个一级评论的children字段是平铺的子评论列表
     */
    @GetMapping
    public ResponseEntity<PageResultDTO<CommentDTO>> getComments(
            @RequestParam Long modelId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        // 校验分页参数
        if (page < 1 || size < 1 || size > 50) {
            return ResponseEntity.badRequest().body(null);
        }
        // 调用服务层获取二级扁平结构的评论列表
        PageResultDTO<CommentDTO> result = commentService.getCommentsByModelId(modelId, page, size);
        return ResponseEntity.ok(result);
    }
}