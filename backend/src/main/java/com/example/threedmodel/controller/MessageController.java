package com.example.threedmodel.controller;

import com.example.threedmodel.dto.MessageDTO;
import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.MessageService;
import com.example.threedmodel.service.UserService;
import com.example.threedmodel.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 私信控制器
 */
@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

  private final MessageService messageService;
  private final JwtUtil jwtUtil;
  private final UserService userService;

  /**
   * 发送私信
   */
  @PostMapping
  public ResponseEntity<?> sendMessage(@RequestBody Map<String, Object> requestBody, HttpServletRequest request) {
    Long currentUserId = getCurrentUserId(request);
    if (currentUserId == null) {
      return unauthorizedResponse("请先登录");
    }

    try {
      Long receiverId = Long.valueOf(requestBody.get("receiverId").toString());
      String content = (String) requestBody.get("content");

      if (content == null || content.trim().isEmpty()) {
        return badRequestResponse("消息内容不能为空");
      }

      messageService.sendMessage(currentUserId, receiverId, content.trim());

      return successResponse("发送成功");
    } catch (Exception e) {
      return errorResponse("发送失败: " + e.getMessage());
    }
  }

  /**
   * 获取收到的私信列表（分页）
   */
  @GetMapping("/received")
  public ResponseEntity<?> getReceivedMessages(
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "20") int size,
      HttpServletRequest request) {
    Long currentUserId = getCurrentUserId(request);
    if (currentUserId == null) {
      return unauthorizedResponse("请先登录");
    }

    try {
      PageResultDTO<MessageDTO> result = messageService.getReceivedMessages(currentUserId, page, size);
      return successResponse(result);
    } catch (Exception e) {
      return errorResponse("获取失败: " + e.getMessage());
    }
  }

  /**
   * 获取发送的私信列表（分页）
   */
  @GetMapping("/sent")
  public ResponseEntity<?> getSentMessages(
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "20") int size,
      HttpServletRequest request) {
    Long currentUserId = getCurrentUserId(request);
    if (currentUserId == null) {
      return unauthorizedResponse("请先登录");
    }

    try {
      PageResultDTO<MessageDTO> result = messageService.getSentMessages(currentUserId, page, size);
      return successResponse(result);
    } catch (Exception e) {
      return errorResponse("获取失败: " + e.getMessage());
    }
  }

  /**
   * 获取最近的对话列表
   */
  @GetMapping("/conversations")
  public ResponseEntity<?> getConversations(HttpServletRequest request) {
    Long currentUserId = getCurrentUserId(request);
    if (currentUserId == null) {
      return unauthorizedResponse("请先登录");
    }

    try {
      List<MessageDTO> conversations = messageService.getRecentConversations(currentUserId);
      return successResponse(conversations);
    } catch (Exception e) {
      return errorResponse("获取失败: " + e.getMessage());
    }
  }

  @GetMapping("/history/{otherUserId}")
  public ResponseEntity<?> getMessageHistory(@PathVariable Long otherUserId, HttpServletRequest request) {
    Long currentUserId = getCurrentUserId(request);
    if (currentUserId == null) {
      return unauthorizedResponse("请先登录");
    }

    try {
      List<MessageDTO> messages = messageService.getConversation(currentUserId, otherUserId);
      return successResponse(messages);
    } catch (Exception e) {
      return errorResponse("获取失败: " + e.getMessage());
    }
  }

  /**
   * 标记单条消息为已读
   */
  @PostMapping("/{messageId}/read")
  public ResponseEntity<?> markAsRead(@PathVariable Long messageId, HttpServletRequest request) {
    Long currentUserId = getCurrentUserId(request);
    if (currentUserId == null) {
      return unauthorizedResponse("请先登录");
    }

    try {
      messageService.markAsRead(messageId, currentUserId);
      return successResponse("标记成功");
    } catch (Exception e) {
      return errorResponse("标记失败: " + e.getMessage());
    }
  }

  /**
   * 标记特定会话已读
   */
  @PutMapping("/conversations/{targetUserId}/read")
  public ResponseEntity<?> markConversationRead(@PathVariable Long targetUserId, HttpServletRequest request) {
    Long currentUserId = getCurrentUserId(request);
    if (currentUserId == null) return unauthorizedResponse("请先登录");
    try {
      messageService.markConversationAsRead(currentUserId, targetUserId);
      return successResponse("会话已标记为已读");
    } catch (Exception e) {
      return errorResponse("标记失败: " + e.getMessage());
    }
  }

  /**
   * 标记所有消息已读
   */
  @PutMapping("/read-all")
  public ResponseEntity<?> markAllRead(HttpServletRequest request) {
    Long currentUserId = getCurrentUserId(request);
    if (currentUserId == null) return unauthorizedResponse("请先登录");
    try {
      messageService.markAllAsRead(currentUserId);
      return successResponse("所有消息已标记为已读");
    } catch (Exception e) {
      return errorResponse("标记失败: " + e.getMessage());
    }
  }

  /**
   * 获取未读消息数量
   */
  @GetMapping("/unread-count")
  public ResponseEntity<?> getUnreadCount(HttpServletRequest request) {
    Long currentUserId = getCurrentUserId(request);
    if (currentUserId == null) {
      return unauthorizedResponse("请先登录");
    }

    try {
      int count = messageService.getUnreadCount(currentUserId);
      Map<String, Object> result = new HashMap<>();
      result.put("count", count);
      return successResponse(result);
    } catch (Exception e) {
      return errorResponse("获取失败: " + e.getMessage());
    }
  }

  private Long getCurrentUserId(HttpServletRequest request) {
    String authHeader = request.getHeader("Authorization");
    if (authHeader == null || !authHeader.toLowerCase().startsWith("bearer ")) {
      return null;
    }
    String token = authHeader.substring(7).trim();
    String username = jwtUtil.extractUsername(token);
    if (username == null) {
      return null;
    }
    User user = userService
        .getOne(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<User>().eq("username", username));
    return user != null ? user.getId() : null;
  }

  private ResponseEntity<?> successResponse(Object data) {
    Map<String, Object> result = new HashMap<>();
    result.put("success", true);
    result.put("data", data);
    return ResponseEntity.ok(result);
  }

  private ResponseEntity<?> errorResponse(String message) {
    Map<String, Object> result = new HashMap<>();
    result.put("success", false);
    result.put("message", message);
    return ResponseEntity.badRequest().body(result);
  }

  private ResponseEntity<?> badRequestResponse(String message) {
    return errorResponse(message);
  }

  private ResponseEntity<?> unauthorizedResponse(String message) {
    Map<String, Object> result = new HashMap<>();
    result.put("success", false);
    result.put("message", message);
    return ResponseEntity.status(401).body(result);
  }
}