package com.example.threedmodel.dto;

import lombok.Data;

@Data
public class PresignedUrlRequest {
    private Long fileId;      // file_info 表的 ID
    private Long modelId;     // 或者用 modelId，二选一
}