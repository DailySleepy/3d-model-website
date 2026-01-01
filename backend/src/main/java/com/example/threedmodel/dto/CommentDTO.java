package com.example.threedmodel.dto;


import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CommentDTO {
    private Long id;
    private Long userId;
    private Long modelId;
    private Long parentId;
    private Long replyToUserId; // 被回复用户ID
    private String content;
    private LocalDateTime createdAt;
    // 关联用户信息
    private UserBriefDTO user;          // 评论发布者信息
    private UserBriefDTO replyToUser;   // 被回复的用户信息

    private List<CommentDTO> children; // 二级结构：子评论列表（B站风格平铺）
}
