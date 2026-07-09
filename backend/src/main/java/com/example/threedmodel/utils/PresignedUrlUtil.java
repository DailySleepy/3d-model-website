package com.example.threedmodel.utils;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;

@Component
public class PresignedUrlUtil {

    @Value("${app.presigned.secret:my-presigned-secret-key}")
    private String secret;

    /**
     * 生成预签名 Token
     * @param resourcePath 资源路径（如 /uploads/models/xxx.glb）
     * @param expiry 过期时间戳（秒）
     * @return Base64 编码的签名
     */
    public String generateToken(String resourcePath, long expiry) {
        String data = resourcePath + ":" + expiry;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"
            );
            mac.init(keySpec);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("签名生成失败", e);
        }
    }

    /**
     * 验证预签名 Token
     * @param resourcePath 资源路径
     * @param expiry 过期时间戳（秒）
     * @param token 客户端传来的签名
     * @return true=有效，false=无效
     */
    public boolean verifyToken(String resourcePath, long expiry, String token) {
        // 1. 检查是否过期
        if (Instant.now().getEpochSecond() > expiry) {
            return false;
        }
        // 2. 重新计算签名并比对
        String expected = generateToken(resourcePath, expiry);
        return expected.equals(token);
    }
}