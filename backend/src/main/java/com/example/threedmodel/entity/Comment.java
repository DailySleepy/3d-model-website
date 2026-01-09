package com.example.threedmodel.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("comments")
public class Comment {

    @TableId(type = IdType.AUTO)
    private Long id;

    @TableField("user_id")
    private Long userId; // 评论发布者ID

    @TableField("model_id")
    private Long modelId; // 关联模型ID

    @TableField("parent_id")
    private Long parentId; // 父评论ID（回复时使用）

    @TableField("content")
    private String content; // 评论内容

    @TableField(value = "created_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt; // 创建时间

    @TableField("reply_to_user_id")
    private Long replyToUserId; // 新增：被回复的用户ID
}