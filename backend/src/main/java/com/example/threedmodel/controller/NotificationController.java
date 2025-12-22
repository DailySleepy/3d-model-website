package com.example.threedmodel.controller;

import com.example.threedmodel.dto.NotificationDTO;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.NotificationService;
import com.example.threedmodel.service.UserService;
import com.example.threedmodel.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 通知接口控制器
 * 鉴权方式与 FollowController 保持一致（JWT → username → userId）
 */
/*
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserService userService;

    // 获取通知列表
    @GetMapping
    public ResponseEntity<?> getNotifications(HttpServletRequest request) {
        Long currentUserId = getCurrentUserId(request);
        if (currentUserId == null) {
            return unauthorizedResponse("请先登录");
        }

        try {
            List<NotificationDTO> notifications = 
                notificationService.getMyNotifications(currentUserId);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("data", notifications);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", "获取通知失败：" + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
    }

    // 标记已读
    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable("id") Long notificationId,
            HttpServletRequest request) {

        Long currentUserId = getCurrentUserId(request);
        if (currentUserId == null) {
            return unauthorizedResponse("请先登录");
        }

        try {
            notificationService.markAsRead(currentUserId, notificationId);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "已标记为已读");
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", "操作失败：" + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        }
    }

    // ==== 上面两个私有方法复制进来 ====
    private Long getCurrentUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) return null;

        String token = authHeader.substring(7).trim();
        if (!jwtUtil.validateToken(token)) return null;

        String username = jwtUtil.extractUsername(token);
        User user = userService.getUserByUsername(username);
        return user != null ? user.getId() : null;
    }

    private ResponseEntity<Map<String, Object>> unauthorizedResponse(String message) {
        Map<String, Object> result = new HashMap<>();
        result.put("success", false);
        result.put("message", message);
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(result);
    }
}*/

@RestController
@RequestMapping("/api/notifications")  // 路径不同，避免和正式接口冲突
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    /**
     * 测试用：直接传 userId，不需要任何登录
     * GET /api/test-notifications?userId=1
     */
    @GetMapping
    public ResponseEntity<?> getNotifications(@RequestParam Long userId) {
        if (userId == null || userId < 0) {
            return ResponseEntity.badRequest().body("请提供有效的 userId");
        }

        List<NotificationDTO> notifications = 
            notificationService.getMyNotifications(userId);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("data", notifications);
        return ResponseEntity.ok(result);
    }

    /**
     * 测试用：标记已读
     * POST /api/test-notifications/5/read?userId=1
     */
    @PostMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable Long id,
            @RequestParam Long userId) {

        if (userId == null || userId <= 0) {
            return ResponseEntity.badRequest().body("请提供有效的 userId");
        }

        notificationService.markAsRead(userId, id);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "已标记为已读（测试模式）");
        return ResponseEntity.ok(result);
    }
}