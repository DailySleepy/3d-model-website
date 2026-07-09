package com.example.threedmodel.dto;

import lombok.Data;

@Data
public class PresignedUrlResponse {
    private String url;           // 完整的预签名访问 URL
    private Long expiresAt;       // 过期时间戳（秒）
    private String fileId;        // 文件 ID
}