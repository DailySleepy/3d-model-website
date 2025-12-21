package com.example.threedmodel.dto;


import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CommentDTO {
    private Long id;
    private Long userId;
    private String username; // 评论者用户名
    private String avatarUrl; // 评论者头像
    private Long modelId;
    private Long parentId;
    private String content;
    private LocalDateTime createdAt;
    private List<CommentDTO> children; // 子回复列表
}