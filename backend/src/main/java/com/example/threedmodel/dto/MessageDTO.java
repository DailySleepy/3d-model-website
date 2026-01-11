package com.example.threedmodel.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class MessageDTO {
    private Long id;
    private Long senderId;
    private Long receiverId;
    private String content;
    private LocalDateTime createdAt;
    private Boolean isRead;
    private Integer unreadCount; // 调用 getRecentConversations 初始化对话列表时才返回每个列表的未读数量

    // 关联用户信息
    private UserBriefDTO sender;
    private UserBriefDTO receiver;
}