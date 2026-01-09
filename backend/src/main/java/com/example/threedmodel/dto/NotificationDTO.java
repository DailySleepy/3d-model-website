package com.example.threedmodel.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 返回给前端的通知 DTO
 * content 由前端根据 type 自行拼接
 */
@Data
public class NotificationDTO {

    private Long id;
    private String type;

    private UserBriefDTO fromUser;
    private ModelBriefDTO model;
    private CommentDTO comment; 

    private Boolean isRead;
    private LocalDateTime createdAt;
}
