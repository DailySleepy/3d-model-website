package com.example.threedmodel.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.threedmodel.dto.MessageDTO;
import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.entity.Message;

import java.util.List;

public interface MessageService extends IService<Message> {

    // 发送私信
    void sendMessage(Long senderId, Long receiverId, String content);

    // 获取用户收到的私信列表（分页）
    PageResultDTO<MessageDTO> getReceivedMessages(Long userId, int page, int size);

    // 获取用户发送的私信列表（分页）
    PageResultDTO<MessageDTO> getSentMessages(Long userId, int page, int size);

    // 获取两个用户之间的私信对话
    List<MessageDTO> getConversation(Long userId, Long otherUserId);

    // 标记消息为已读
    void markAsRead(Long messageId, Long userId);

    // 获取用户最近的对话列表
    List<MessageDTO> getRecentConversations(Long userId);