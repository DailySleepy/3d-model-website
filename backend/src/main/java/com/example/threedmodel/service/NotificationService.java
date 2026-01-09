package com.example.threedmodel.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.threedmodel.dto.*;
import com.example.threedmodel.entity.Notification;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.entity.Comment; // ===== 新增：用于查询评论 =====
import com.example.threedmodel.mapper.NotificationMapper;
import com.example.threedmodel.model.entity.User;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 通知服务（接口 + 实现）
 */
@Service
public class NotificationService extends ServiceImpl<NotificationMapper, Notification>{

    @Resource
    private NotificationMapper notificationMapper;

    @Resource
    private UserService userService;

    @Resource
    private ModelService modelService;

    @Resource
    private CommentService commentService; // ===== 新增：用于查评论 =====

    /* ================== 写入通知（被监听器调用） ================== */

    /**
     * 创建一条通知
     * 被 NotificationEventListener 调用
     */
    public void create(Long userId, Long fromId, Long modelId, String type) {

        // 不给自己发通知
        if (userId.equals(fromId)) {
            return;
        }

        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setFromId(fromId);
        notification.setModelId(modelId);
        notification.setType(type);
        notification.setIsRead(false);
        notification.setCreatedAt(LocalDateTime.now());

        // ⚠️ 如果是评论通知，commentId 由重载方法或后续 set
        notificationMapper.insert(notification);
    }

    /**
     * ===== 新增：用于评论通知的 create 方法 =====
     * 仅 COMMENT 类型会用到 commentId
     */
    public void create(Long userId,
                       Long fromId,
                       Long modelId,
                       Long commentId,
                       String type) {

        if (userId.equals(fromId)) {
            return;
        }

        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setFromId(fromId);
        notification.setModelId(modelId);
        notification.setCommentId(commentId); // ===== 新增 =====
        notification.setType(type);
        notification.setIsRead(false);
        notification.setCreatedAt(LocalDateTime.now());

        // System.out.println("成功生成通知");

        notificationMapper.insert(notification);
    }

    /* ================== 查询通知 ================== */

    /**
     * 获取当前用户的通知列表
     * 被 NotificationController 调用
     */
    public List<NotificationDTO> getMyNotifications(Long userId) {

        QueryWrapper<Notification> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId)
               .orderByDesc("created_at");

        List<Notification> list = notificationMapper.selectList(wrapper);
        List<NotificationDTO> result = new ArrayList<>();

        for (Notification n : list) {
            NotificationDTO dto = new NotificationDTO();
            dto.setId(n.getId());
            dto.setType(n.getType());
            dto.setIsRead(n.getIsRead());
            dto.setCreatedAt(n.getCreatedAt());

            // ================= fromUser =================
            if (n.getFromId() != null) {
                User u = userService.getById(n.getFromId());
                if (u != null) {
                    UserBriefDTO ub = new UserBriefDTO();
                    ub.setId(u.getId());
                    ub.setUsername(u.getUsername());
                    ub.setAvatar(u.getAvatar());
                    dto.setFromUser(ub);
                }
            }

            // ================= model =================
            if (n.getModelId() != null) {
                Model m = modelService.getById(n.getModelId());
                if (m != null) {
                    ModelBriefDTO mb = new ModelBriefDTO();
                    mb.setId(m.getId());
                    mb.setTitle(m.getTitle());
                    mb.setCoverUrl(m.getThumbnailUrl());
                    dto.setModel(mb);
                }
            }

            // ================= comment =================
            // 只有 COMMENT 类型才返回 comment
            if ("COMMENT".equals(n.getType()) && n.getCommentId() != null) {

                Comment c = commentService.getById(n.getCommentId());//根据id找评论，获取content
                if (c != null) {
                    // 可能需要 CommentBriefDTO
                    CommentDTO cd = new CommentDTO();

                    // ===== 关键点：只 set 需要的字段 =====
                    cd.setId(c.getId());
                    cd.setParentId(c.getParentId());
                    cd.setContent(c.getContent());

                    dto.setComment(cd);
                }
            }

            result.add(dto);
        }

        return result;
    }

    /* ================== 已读操作 ================== */

    /**
     * 标记通知为已读
     * 被 NotificationController 调用
     */
    public void markAsRead(Long userId, Long notificationId) {

        Notification n = notificationMapper.selectById(notificationId);
        if (n == null || !n.getUserId().equals(userId)) {
            return;
        }

        n.setIsRead(true);
        notificationMapper.updateById(n);
    }

    /**
     * 获取未读通知数量
     */
    public int getUnreadCount(Long userId) {
        return (int) this.count(
                new QueryWrapper<Notification>()
                        .eq("user_id", userId)
                        .eq("is_read", false)
        );
    }

    /**
     * 将该用户的所有通知标记为已读
     */
    public void markAllAsRead(Long userId) {

        List<Notification> list = this.list(
                new QueryWrapper<Notification>()
                        .eq("user_id", userId)
                        .eq("is_read", false)
        );

        if (list.isEmpty()) {
            return;
        }

        for (Notification n : list) {
            n.setIsRead(true);
        }

        this.updateBatchById(list);
    }
}
