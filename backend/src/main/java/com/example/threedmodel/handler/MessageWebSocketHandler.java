package com.example.threedmodel.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class MessageWebSocketHandler extends TextWebSocketHandler {

    // TODO: 实现多端同步
    private static final Map<Long, WebSocketSession> USER_SESSIONS = new ConcurrentHashMap<>();
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    {
        // 解决问题: 在执行WebSocket消息推送时, Jackson序列化库无法处理Java8的java.time.LocalDateTime类型
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Long userId = (Long) session.getAttributes().get("userId");
        if (userId != null) {
            USER_SESSIONS.put(userId, session);
            log.info("用户 [{}] WebSocket 连接成功, 当前在线人数: {}", userId, USER_SESSIONS.size());
        } else {
            session.close();
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        Long userId = (Long) session.getAttributes().get("userId");
        if (userId != null) {
            USER_SESSIONS.remove(userId);
            log.info("用户 [{}] WebSocket 连接断开", userId);
        }
    }

    /**
     * 发送私信给指定用户
     * @param receiverId 接收者ID
     * @param payload 消息数据对象 (DTO)
     */
    public void sendPrivateMessage(Long receiverId, Object payload) {
        WebSocketSession session = USER_SESSIONS.get(receiverId);
        if (session != null && session.isOpen()) {
            try {
                String jsonMsg = objectMapper.writeValueAsString(payload);
                session.sendMessage(new TextMessage(jsonMsg));
                log.info("WebSocket 推送消息给用户 [{}] 成功", receiverId);
            } catch (IOException e) {
                log.error("WebSocket 推送消息给用户 [{}] 失败", receiverId, e);
            }
        } else {
            log.debug("用户 [{}] 离线", receiverId);
        }
    }
}