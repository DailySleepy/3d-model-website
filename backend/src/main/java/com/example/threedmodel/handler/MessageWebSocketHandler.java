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
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Slf4j
@Component
public class MessageWebSocketHandler extends TextWebSocketHandler {

    private static final Map<Long, Set<WebSocketSession>> USER_SESSIONS = new ConcurrentHashMap<>();
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    {
        // 解决问题: 在执行WebSocket消息推送时, Jackson序列化库无法处理Java8的java.time.LocalDateTime类型
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Long userId = (Long) session.getAttributes().get("userId");
        if (userId != null) {
            USER_SESSIONS.computeIfAbsent(userId, k -> new CopyOnWriteArraySet<>()).add(session);
            log.info("用户 [{}] 新设备上线, 当前设备数: {}, 总人数: {}", userId, USER_SESSIONS.get(userId).size(), USER_SESSIONS.size());
        } else {
            session.close();
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        Long userId = (Long) session.getAttributes().get("userId");
        if (userId != null) {
            Set<WebSocketSession> sessions = USER_SESSIONS.get(userId);
            if (sessions != null) {
                sessions.remove(session);
                log.info("用户 [{}] 设备下线", userId);
                if(sessions.isEmpty()) {
                    USER_SESSIONS.remove(userId);
                }
            }
        }
    }

    /**
     * 发送私信给指定用户
     * @param receiverId 接收者ID
     * @param payload 消息数据对象 (DTO)
     */
    public void sendPrivateMessage(Long receiverId, Object payload) {
        Set<WebSocketSession> sessions = USER_SESSIONS.get(receiverId);
        if (sessions != null && !sessions.isEmpty()) {
            String jsonMsg;
            try {
                jsonMsg = objectMapper.writeValueAsString(payload);
            } catch (IOException e) {
                log.error("消息序列化失败", e);
                return;
            }
            // 给用户的每个设备都发消息
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        session.sendMessage(new TextMessage(jsonMsg));
                    } catch (IOException e) {
                        log.error("推送消息给用户 [{}] 失败", receiverId, e);
                    }
                }
            }
            log.info("已尝试推送给用户 [{}] 的 {} 个设备", receiverId, sessions.size());
        } else {
            log.debug("用户 [{}] 离线", receiverId);
        }
    }
}