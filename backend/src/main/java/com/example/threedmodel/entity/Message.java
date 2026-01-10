package com.example.threedmodel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 私信实体
 * 对应表：messages
 */
@Data
@TableName("messages")
public class Message {

  @TableId(type = IdType.AUTO)
  private Long id;

  /** 发送者ID */
  private Long senderId;

  /** 接收者ID */
  private Long receiverId;

  /** 消息内容 */
  private String content;

  /** 发送时间 */
  private LocalDateTime createdAt;

  /** 是否已读 */
  private Boolean isRead;
}