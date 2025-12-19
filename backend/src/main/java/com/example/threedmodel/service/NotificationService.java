package com.example.threedmodel.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.threedmodel.dto.*;
import com.example.threedmodel.entity.Notification;
import com.example.threedmodel.entity.Model; // ⚠️ 若你的 Model 包名不同请改
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
public class NotificationService {

    @Resource
    private NotificationMapper notificationMapper;

    @Resource
    private UserService userService;

    @Resource
    private ModelService modelService; 

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

            // fromUser
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

            // model
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
}
