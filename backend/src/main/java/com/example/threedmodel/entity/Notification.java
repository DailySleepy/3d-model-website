package com.example.threedmodel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 通知实体
 * 对应表：notifications
 */
@Data
@TableName("notifications")
public class Notification {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 接收通知的用户 */
    private Long userId;

    /** like / collect / comment / publish / system */
    private String type;

    /** 触发者（系统通知可为 null） */
    private Long fromId;

    /** 关联模型（系统通知可为 null） */
    private Long modelId;

    private Long commentId; 

    private LocalDateTime createdAt;

    private Boolean isRead;
}
