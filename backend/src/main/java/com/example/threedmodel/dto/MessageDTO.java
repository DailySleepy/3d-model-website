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

    // 关联用户信息
    private UserBriefDTO sender;
    private UserBriefDTO receiver;
}