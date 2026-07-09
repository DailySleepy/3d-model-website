package com.example.threedmodel.dto;

import lombok.Data;

@Data
public class PresignedUrlRequest {
    private Long fileId;      // file_info 表的主键 ID（推荐使用）
    private Long modelId;     // models 表的主键 ID（可选，需 model_main_file 表有数据）
}