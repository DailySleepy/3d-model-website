package com.example.threedmodel.service.impl;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.threedmodel.dto.MessageDTO;
import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.dto.UserBriefDTO;
import com.example.threedmodel.entity.Message;
import com.example.threedmodel.handler.MessageWebSocketHandler;
import com.example.threedmodel.mapper.MessageMapper;
import com.example.threedmodel.mapper.UserMapper;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.MessageService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MessageServiceImpl extends ServiceImpl<MessageMapper, Message> implements MessageService {

  private final MessageMapper messageMapper;
  private final UserMapper userMapper;

  private final MessageWebSocketHandler webSocketHandler;

  @Override
  @Transactional
  public void sendMessage(Long senderId, Long receiverId, String content) {
    // 验证接收者存在
    User receiver = userMapper.selectById(receiverId);
    if (receiver == null) {
      throw new RuntimeException("接收者不存在");
    }

    Message message = new Message();
    message.setSenderId(senderId);
    message.setReceiverId(receiverId);
    message.setContent(content);
    message.setCreatedAt(LocalDateTime.now());
    message.setIsRead(false);
    baseMapper.insert(message);

    MessageDTO messageDTO = convertToDTO(message);
    // 确保ws推送在事务完成后, 防止ws推送速度过快导致用户对单条消息已读的标记失败(因为事务还未完成, DB根本就没有这条信息)
    if (TransactionSynchronizationManager.isActualTransactionActive()) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    webSocketHandler.sendPrivateMessage(receiverId, messageDTO);
                    webSocketHandler.sendPrivateMessage(senderId, messageDTO); // 给自己也推送, 实现多端同步
                } catch (Exception e) {
                    log.error("WebSocket 推送失败", e);
                }
            }
        });
    } else {
        webSocketHandler.sendPrivateMessage(receiverId, messageDTO);
    }
  }

  @Override
  public PageResultDTO<MessageDTO> getReceivedMessages(Long userId, int page, int size) {
    LambdaQueryWrapper<Message> wrapper = new LambdaQueryWrapper<>();
    wrapper.eq(Message::getReceiverId, userId)
        .orderByDesc(Message::getCreatedAt);

    IPage<Message> messagePage = baseMapper.selectPage(new Page<>(page, size), wrapper);
    List<MessageDTO> messageDTOs = messagePage.getRecords().stream()
        .map(this::convertToDTO)
        .collect(Collectors.toList());

    return new PageResultDTO<>(messageDTOs, messagePage.getTotal(), page, size);
  }

  @Override
  public PageResultDTO<MessageDTO> getSentMessages(Long userId, int page, int size) {
    LambdaQueryWrapper<Message> wrapper = new LambdaQueryWrapper<>();
    wrapper.eq(Message::getSenderId, userId)
        .orderByDesc(Message::getCreatedAt);

    IPage<Message> messagePage = baseMapper.selectPage(new Page<>(page, size), wrapper);
    List<MessageDTO> messageDTOs = messagePage.getRecords().stream()
        .map(this::convertToDTO)
        .collect(Collectors.toList());

    return new PageResultDTO<>(messageDTOs, messagePage.getTotal(), page, size);
  }

  @Override
  public List<MessageDTO> getConversation(Long userId, Long otherUserId) {
    LambdaQueryWrapper<Message> wrapper = new LambdaQueryWrapper<>();
    wrapper.and(w -> w.eq(Message::getSenderId, userId).eq(Message::getReceiverId, otherUserId))
        .or(w -> w.eq(Message::getSenderId, otherUserId).eq(Message::getReceiverId, userId))
        .orderByAsc(Message::getCreatedAt);

    List<Message> messages = baseMapper.selectList(wrapper);
    return messages.stream()
        .map(this::convertToDTO)
        .collect(Collectors.toList());
  }

  @Override
  @Transactional
  public void markAsRead(Long messageId, Long userId) {
    Message message = baseMapper.selectById(messageId);
    if (message != null && message.getReceiverId().equals(userId) && !message.getIsRead()) {
      message.setIsRead(true);
      baseMapper.updateById(message);
    }
  }

  @Override
  @Transactional
  public void markConversationAsRead(Long currentUserId, Long targetUserId) {
    // UPDATE messages SET is_read = true WHERE receiver_id = me AND sender_id = other AND is_read = false
    LambdaUpdateWrapper<Message> updateWrapper = new LambdaUpdateWrapper<>();
    updateWrapper.eq(Message::getReceiverId, currentUserId)
                    .eq(Message::getSenderId, targetUserId)
                    .eq(Message::getIsRead, false)
                    .set(Message::getIsRead, true);

    baseMapper.update(null, updateWrapper);
  }

  @Override
  @Transactional
  public void markAllAsRead(Long currentUserId) {
    // UPDATE messages SET is_read = true WHERE receiver_id = me AND is_read = false
    LambdaUpdateWrapper<Message> updateWrapper = new LambdaUpdateWrapper<>();
    updateWrapper.eq(Message::getReceiverId, currentUserId)
                    .eq(Message::getIsRead, false)
                    .set(Message::getIsRead, true);

    baseMapper.update(null, updateWrapper);
  }

  @Override
  public int getUnreadCount(Long userId) {
    LambdaQueryWrapper<Message> wrapper = new LambdaQueryWrapper<>();
    wrapper.eq(Message::getReceiverId, userId)
        .eq(Message::getIsRead, false);
    return Math.toIntExact(baseMapper.selectCount(wrapper));
  }

  @Override
  public List<MessageDTO> getRecentConversations(Long userId) {
    // 获取用户参与的所有对话的最后一条消息
    // 这里需要自定义查询，因为MyBatis-Plus的复杂查询有限制
    // 简单实现：获取用户发送和接收的所有消息，按时间排序，取每个对话的最后一条
    LambdaQueryWrapper<Message> wrapper = new LambdaQueryWrapper<>();
    wrapper.and(w -> w.eq(Message::getSenderId, userId).or().eq(Message::getReceiverId, userId))
        .orderByDesc(Message::getCreatedAt);

    List<Message> allMessages = baseMapper.selectList(wrapper);

    // 使用Map来存储每个对话的最后消息
    Map<Long, Message> conversationMap = new LinkedHashMap<>();
    Map<Long, Integer> unreadCountMap = new HashMap<>(); // 存储每个对话的未读数

    for (Message message : allMessages) {
      Long otherUserId = message.getSenderId().equals(userId) ? message.getReceiverId() : message.getSenderId();
      if (!conversationMap.containsKey(otherUserId)) {
        conversationMap.put(otherUserId, message);
      }
      if (message.getReceiverId().equals(userId) && !message.getIsRead()) {
        unreadCountMap.put(otherUserId, unreadCountMap.getOrDefault(otherUserId, 0) + 1);
      }
    }

    return conversationMap.entrySet().stream()
        .map(entry -> {
            Long otherUserId = entry.getKey();
            Message message = entry.getValue();
            MessageDTO dto = convertToDTO(message);
            dto.setUnreadCount(unreadCountMap.getOrDefault(otherUserId, 0));
            return dto;
        })
        .collect(Collectors.toList());
  }

  private MessageDTO convertToDTO(Message message) {
    MessageDTO dto = new MessageDTO();
    dto.setId(message.getId());
    dto.setSenderId(message.getSenderId());
    dto.setReceiverId(message.getReceiverId());
    dto.setContent(message.getContent());
    dto.setCreatedAt(message.getCreatedAt());
    dto.setIsRead(message.getIsRead());

    // 获取发送者信息
    User sender = userMapper.selectById(message.getSenderId());
    if (sender != null) {
      UserBriefDTO senderDTO = new UserBriefDTO();
      senderDTO.setId(sender.getId());
      senderDTO.setUsername(sender.getUsername());
      senderDTO.setAvatar(sender.getAvatar());
      dto.setSender(senderDTO);
    }

    // 获取接收者信息
    User receiver = userMapper.selectById(message.getReceiverId());
    if (receiver != null) {
      UserBriefDTO receiverDTO = new UserBriefDTO();
      receiverDTO.setId(receiver.getId());
      receiverDTO.setUsername(receiver.getUsername());
      receiverDTO.setAvatar(receiver.getAvatar());
      dto.setReceiver(receiverDTO);
    }

    return dto;
  }
}
