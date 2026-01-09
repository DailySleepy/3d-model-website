package com.example.threedmodel.listener;

import com.example.threedmodel.entity.Notification;
import com.example.threedmodel.event.*;
import com.example.threedmodel.service.NotificationService;
import com.example.threedmodel.service.FollowerService;
import com.example.threedmodel.service.CommentService;

import jakarta.annotation.Resource;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * 通知事件监听器
 * 监听业务事件并生成通知
 */
@Component
public class NotificationEventListener {

    @Resource
    private NotificationService notificationService;

    @Resource
    private FollowerService followerService;

    

    /**
     * 监听关注事件
     */
    @EventListener
    public void handleFollow(FollowEvent event) {

        Long followerId = event.getFollowerId(); // 谁关注的
        Long userId = event.getUserId();         // 被关注者

        // 给被关注者发通知
        notificationService.create(
                userId,         // 接收人
                followerId,     // 触发人
                null,           // modelId（关注无模型）
                "follow"
        );
    }

    /**
     * 点赞 / 收藏通知
     */
    @EventListener
    public void handleModelAction(ModelActionEvent event) {
        notificationService.create(
                event.getTargetUserId(),
                event.getOperatorId(),
                event.getModelId(),
                event.getType()
        );
    }

    /**
     * 评论通知
     */
    // 新增评论事件处理
    @EventListener
    public void handleModelCommentEvent(ModelCommentEvent event) {
        // 直接复用队友封装的 notificationService.create() 方法
        // 参数对应关系：接收通知用户ID → 触发者ID → 模型ID → 通知类型
        // 完全匹配 handleModelAction 方法的参数格式，兼容现有逻辑
        notificationService.create(
                event.getToUserId(),    // 接收通知的用户ID（模型作者/被回复者）
                event.getFromUserId(),  // 触发者ID（评论者）
                event.getModelId(),     // 关联模型ID
                event.getCommentId(),   // 关联评论ID
                "COMMENT"               // 通知类型（与数据库定义一致）
        );
    }

    /**
     * 作者发布新模型（给关注者）
     */
    /**
     * 作者发布新模型 → 通知其所有粉丝
     */
    @EventListener
    public void handlePublish(ModelPublishEvent event) {

        Long authorId = event.getAuthorId();
        Long modelId = event.getModelId();

        // 1. 获取作者的所有粉丝
        List<Long> followerIds = followerService.getFollowerIds(authorId);

        // 2. 给每个粉丝发送通知
        for (Long followerId : followerIds) {
            notificationService.create(
                    followerId,     // 接收通知的人
                    authorId,       // 触发者（作者）
                    modelId,        // 模型
                    "publish"       // 类型
            );
        }
    }
}
