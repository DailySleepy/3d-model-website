package com.example.threedmodel.utils;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {
    private static final SecretKey SECRET_KEY =
            Keys.hmacShaKeyFor("mysecretkeymysecretkeymysecretkey".getBytes());
    private static final long EXPIRATION_TIME = 86400000; // 1天

    public String generateToken(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(SECRET_KEY)
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    // 修复异常捕获逻辑：只保留父类JwtException + 非继承关系的IllegalArgumentException
    /**
     * 校验令牌是否有效（过期/篡改/格式错误都会返回false）
     * @param token JWT令牌
     * @return true=有效，false=无效
     */
    public boolean validateToken(String token) {
        try {
            // 解析令牌，无异常则有效
            Jwts.parserBuilder()
                    .setSigningKey(SECRET_KEY)
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (IllegalArgumentException e) {
            // 令牌为空、空字符串等参数错误
            return false;
        } catch (JwtException e) {
            // 所有JWT相关异常（包含过期、格式错误、签名失败等子类异常）
            return false;
        }
    }

    /**
     * 提取令牌过期时间（可选，用于前端提示）
     */
    public Date extractExpiration(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getExpiration();
    }
}