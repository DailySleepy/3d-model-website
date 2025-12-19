package com.example.threedmodel.event;

import lombok.Data;

/**
 * 评论事件
 */
@Data
public class ModelCommentEvent {

    private Long operatorId;
    private Long targetUserId;
    private Long modelId;
}
