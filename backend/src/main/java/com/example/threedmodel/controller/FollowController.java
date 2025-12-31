package com.example.threedmodel.controller;

import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.FollowerService;
import com.example.threedmodel.service.UserService;
import com.example.threedmodel.utils.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;

/**
 * 关注功能控制器（兼容原有JWT逻辑：存储username，解析后转userId）
 */
@RestController
@RequestMapping("/api/users")
public class FollowController {

    // 注入必要的服务
    @Autowired
    private FollowerService followerService;
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private UserService userService; // 需确保UserService已实现根据username查询用户的方法

    /**
     * 关注指定ID的用户
     * POST /api/users/:id/follow
     */
    @PostMapping("/{id}/follow")
    public ResponseEntity<Map<String, Object>> followUser(
            @PathVariable("id") Long targetUserId,
            HttpServletRequest request
    ) {
        // 初始化响应结果
        Map<String, Object> result = new HashMap<>();

        try {
            // 1. 校验Authorization请求头是否存在
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                result.put("success", false);
                result.put("message", "请先登录");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
            }

            // 2. 提取并校验令牌
            String token = authHeader.replace("Bearer ", "").trim();
            if (!jwtUtil.validateToken(token)) {
                result.put("success", false);
                result.put("message", "请先登录");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
            }

            // 3. 解析用户名 → 转换为用户ID（兼容原有JWT逻辑）
            String username = jwtUtil.extractUsername(token);
            User currentUser = userService.getUserByUsername(username); // 需确保UserService有此方法
            if (currentUser == null) {
                result.put("success", false);
                result.put("message", "用户不存在");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
            }
            Long currentUserId = currentUser.getId();

            // 4. 校验：不能关注自己
            if (currentUserId.equals(targetUserId)) {
                result.put("success", false);
                result.put("message", "不能关注自己");
                return ResponseEntity.badRequest().body(result);
            }

            // 5. 执行关注操作
            boolean isSuccess = followerService.follow(targetUserId, currentUserId);
            if (isSuccess) {
                result.put("success", true);
                result.put("message", "关注成功");
                return ResponseEntity.ok(result);
            } else {
                result.put("success", false);
                result.put("message", "已经关注过该用户");
                return ResponseEntity.badRequest().body(result);
            }

        } catch (Exception e) {
            // 系统异常处理
            result.put("success", false);
            result.put("message", "关注失败：" + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
    }

    /**
     * 取消关注指定ID的用户
     * DELETE /api/users/:id/follow
     */
    @DeleteMapping("/{id}/follow")
    public ResponseEntity<Map<String, Object>> unfollowUser(
            @PathVariable("id") Long targetUserId,
            HttpServletRequest request
    ) {
        // 初始化响应结果
        Map<String, Object> result = new HashMap<>();

        try {
            // 1. 校验Authorization请求头是否存在
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                result.put("success", false);
                result.put("message", "请先登录");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
            }

            // 2. 提取并校验令牌
            String token = authHeader.replace("Bearer ", "").trim();
            if (!jwtUtil.validateToken(token)) {
                result.put("success", false);
                result.put("message", "请先登录");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
            }

            // 3. 解析用户名 → 转换为用户ID（兼容原有JWT逻辑）
            String username = jwtUtil.extractUsername(token);
            User currentUser = userService.getUserByUsername(username);
            if (currentUser == null) {
                result.put("success", false);
                result.put("message", "用户不存在");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
            }
            Long currentUserId = currentUser.getId();

            // 4. 执行取消关注操作
            boolean isSuccess = followerService.unfollow(targetUserId, currentUserId);
            if (isSuccess) {
                result.put("success", true);
                result.put("message", "取消关注成功");
                return ResponseEntity.ok(result);
            } else {
                result.put("success", false);
                result.put("message", "未关注该用户，无需取消");
                return ResponseEntity.badRequest().body(result);
            }

        } catch (Exception e) {
            // 系统异常处理
            result.put("success", false);
            result.put("message", "取消关注失败：" + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
    }

    /**
     * 检查是否关注了指定ID的用户
     * GET /api/users/:id/is-following
     */
    @GetMapping("/{id}/is-following")
    public ResponseEntity<Map<String, Object>> checkFollowStatus(
            @PathVariable("id") Long targetUserId,
            HttpServletRequest request
    ) {
        Map<String, Object> result = new HashMap<>();
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                result.put("isFollowing", false);
                return ResponseEntity.ok(result);
            }
            String token = authHeader.replace("Bearer ", "").trim();
            if (!jwtUtil.validateToken(token)) {
                result.put("isFollowing", false);
                return ResponseEntity.ok(result);
            }
            String username = jwtUtil.extractUsername(token);
            User currentUser = userService.getUserByUsername(username);
            if (currentUser == null) {
                result.put("isFollowing", false);
                return ResponseEntity.ok(result);
            }
            Long currentUserId = currentUser.getId();
            
            boolean isFollowing = followerService.isFollowing(targetUserId, currentUserId);
            result.put("isFollowing", isFollowing);
            result.put("success", true);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
    }
}