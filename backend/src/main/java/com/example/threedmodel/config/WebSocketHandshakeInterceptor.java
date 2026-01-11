package com.example.threedmodel.config;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.UserService;
import com.example.threedmodel.utils.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtUtil jwtUtil;
    private final UserService userService;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) throws Exception {
        if (request instanceof ServletServerHttpRequest) {
            HttpServletRequest servletRequest = ((ServletServerHttpRequest) request).getServletRequest();
            String token = servletRequest.getParameter("token");

            if (token != null && !token.isEmpty()) {
                try {
                    // 1. 验证 Token 并获取用户名
                    String username = jwtUtil.extractUsername(token);
                    if (username != null) {
                        // 2. 查询数据库获取 UserId (为了准确性)
                        User user = userService.getOne(new QueryWrapper<User>().eq("username", username));
                        if (user != null) {
                            // 3. 将 UserId 放入 WebSocket Session 的属性中
                            attributes.put("userId", user.getId());
                            return true;
                        }
                    }
                } catch (Exception e) {
                    log.warn("WebSocket 认证失败: {}", e.getMessage());
                }
            }
        }
        log.warn("WebSocket 握手被拒绝：无效的 Token");
        return false;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // 握手后处理, 通常不需要操作
    }
}