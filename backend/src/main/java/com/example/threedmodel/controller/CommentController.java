package com.example.threedmodel.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.threedmodel.dto.CommentCreateDTO;
import com.example.threedmodel.dto.CommentDTO;
import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.CommentService;
import com.example.threedmodel.service.UserService;
import com.example.threedmodel.utils.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;
    private final JwtUtil jwtUtil;
    // 【新增】注入UserService
    private final UserService userService;

    /**
     * 创建评论/回复
     */
    @PostMapping
    public ResponseEntity<CommentDTO> createComment(
            @Valid @RequestBody CommentCreateDTO dto,
            HttpServletRequest request
    ) {
        // 步骤1：获取Authorization头并清理Bearer前缀
        String authHeader = request.getHeader("Authorization");
        String token = authHeader;
        if (token != null && token.toLowerCase().startsWith("bearer ")) {
            token = token.substring(7).trim();
        }

        // 步骤2：提取用户名
        String username = jwtUtil.extractUsername(token);

        // 步骤3：通过用户名查询用户，获取UserId
        User user = userService.getOne(new QueryWrapper<User>().eq("username", username));
        if (user == null) {
            return ResponseEntity.badRequest().body(null); // 或抛出异常
        }
        Long userId = user.getId();

        CommentDTO comment = commentService.createComment(dto, userId);
        return ResponseEntity.ok(comment);
    }

    /**
     * 删除评论/回复
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        // 步骤1：获取Authorization头并清理Bearer前缀
        String authHeader = request.getHeader("Authorization");
        String token = authHeader;
        if (token != null && token.toLowerCase().startsWith("bearer ")) {
            token = token.substring(7).trim();
        }

        // 步骤2：提取用户名
        String username = jwtUtil.extractUsername(token);

        // 步骤3：通过用户名查询用户，获取UserId
        User user = userService.getOne(new QueryWrapper<User>().eq("username", username));
        if (user == null) {
            return ResponseEntity.badRequest().build(); // 或抛出异常
        }
        Long userId = user.getId();

        commentService.deleteComment(id, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 分页查询模型的评论列表
     */
    @GetMapping
    public ResponseEntity<PageResultDTO<CommentDTO>> getComments(
            @RequestParam Long modelId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PageResultDTO<CommentDTO> result = commentService.getCommentsByModelId(modelId, page, size);
        return ResponseEntity.ok(result);
    }
}