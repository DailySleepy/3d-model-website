package com.example.threedmodel.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ModelCommentEvent extends ApplicationEvent {
    private final Long fromUserId; // 触发者ID（评论者）
    private final Long toUserId;   // 接收者ID（模型作者/被回复者）
    private final Long modelId;    // 关联模型ID
    private final Long commentId;  // 评论ID

    public ModelCommentEvent(Object source, Long fromUserId, Long toUserId, Long modelId, Long commentId) {
        super(source);
        this.fromUserId = fromUserId;
        this.toUserId = toUserId;
        this.modelId = modelId;
        this.commentId = commentId;
    }
}