package com.example.threedmodel.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.threedmodel.dto.ModelCreateDTO;
import com.example.threedmodel.entity.FileInfo;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.mapper.FileInfoMapper;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.ModelService;
import com.example.threedmodel.service.UserService;
import com.example.threedmodel.utils.JwtUtil;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/models")
public class ModelController {

    @Autowired
    private ModelService modelService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private FileInfoMapper fileInfoMapper;  // 新增

    /**
     * 从 JWT 中获取 userId（与其他 Controller 统一）
     */
    private Long getUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.toLowerCase().startsWith("bearer ")) {
            return null;
        }

        String token = authHeader.substring(7).trim();
        String username = jwtUtil.extractUsername(token);
        if (username == null) {
            return null;
        }

        User user = userService.getOne(
                new QueryWrapper<User>().eq("username", username)
        );

        return user == null ? null : user.getId();
    }

    /**
     * 发布模型
     */
    @PostMapping
    public ResponseEntity<?> publishModel(
            @RequestBody ModelCreateDTO dto,
            HttpServletRequest request
    ) {
        Long userId = getUserId(request);
        if (userId == null) {
            return ResponseEntity.status(401).body("用户未登录或 Token 无效");
        }

        // 设置作者 ID（关键）
        dto.setAuthorId(userId);

        Long id = modelService.publishModel(dto);
        return ResponseEntity.ok(new Response(id, "发布成功"));
    }

    /**
     * 获取模型列表（支持按作者筛选）
     */
    @GetMapping
    public ResponseEntity<?> getModels(
            @RequestParam(required = false) Long authorId,
            HttpServletRequest request
    ) {
        // 1. 如果指定了 authorId，直接查询该作者的模型
        if (authorId != null) {
            List<Model> models = modelService.getModelsByAuthor(authorId);
            return ResponseEntity.ok(models);
        }

        // 2. 如果没指定 authorId，尝试获取当前登录用户的模型
        Long userId = getUserId(request);
        if (userId != null) {
            List<Model> models = modelService.getModelsByAuthor(userId);
            return ResponseEntity.ok(models);
        }

        // 3. 既没指定作者，也没登录，返回错误或空列表
        return ResponseEntity.badRequest().body("请指定 authorId 或先登录");
    }

    /**
     * 查询文件转换状态（供前端轮询）
     * @param fileId file_info 表的主键 ID
     * @return 状态码：0-待处理，1-处理中，2-成功，3-失败
     */
    @GetMapping("/file/status/{fileId}")
    public ResponseEntity<Integer> getConvertStatus(@PathVariable Long fileId) {
        FileInfo fileInfo = fileInfoMapper.selectById(fileId);
        if (fileInfo == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(fileInfo.getConvertStatus());
    }

    record Response(Long id, String message) {}
}
