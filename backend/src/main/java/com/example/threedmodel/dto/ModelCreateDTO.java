package com.example.threedmodel.dto;

import lombok.Data;
import java.util.List;


@Data
public class ModelCreateDTO {
    private String title;
    private String description;
    private String category;
    private String[] tags;
    private Long fileInfoId;               // 主模型文件引用
    private Long thumbnailFileInfoId;      // 封面图文件引用
    private List<Long> previewFileInfoIds; // 预览图文件引用列表
    private List<Long> shaderTextureFileInfoIds; // 着色器自定义贴图文件引用列表
    private String shaderGraphJson;
    private Long authorId;
}
