package com.example.threedmodel.listener;

import com.example.threedmodel.event.*;
import com.example.threedmodel.service.NotificationService;
import com.example.threedmodel.service.FollowerService;
//import com.example.threedmodel.service.CommentService;
import jakarta.annotation.Resource;

import java.util.List;

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
    @EventListener
    public void handleComment(ModelCommentEvent event) {
        notificationService.create(
                event.getTargetUserId(),
                event.getOperatorId(),
                event.getModelId(),
                "comment"
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
