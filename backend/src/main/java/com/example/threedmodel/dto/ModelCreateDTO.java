package com.example.threedmodel.dto;

import lombok.Data;


@Data
public class ModelCreateDTO {
    private String title;
    private String description;
    private String category;
    private String[] tags;
    private String fileUrl;
    private String thumbnailUrl;
    private String[] previewUrls;
    private String shaderGraphJson;
    private Long authorId;
    // private Long fileInfoId;   // 新增：关联 file_info 表的主键
}
