package com.example.threedmodel.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 用户关注事件
 * followerId -> 关注者
 * userId     -> 被关注者
 */
@Getter
public class FollowEvent extends ApplicationEvent {

    private final Long followerId;
    private final Long userId;

    public FollowEvent(Object source, Long followerId, Long userId) {
        super(source);
        this.followerId = followerId;
        this.userId = userId;
    }
}
