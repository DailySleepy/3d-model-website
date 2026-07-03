package com.example.threedmodel.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.example.threedmodel.handler.PgArrayTypeHandler;

import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName(value = "models", autoResultMap = true)  // autoResultMap = true 用于handler
public class Model {

    @TableId(type = IdType.AUTO)
    private Long id;

    private String title;
    private String description;
    private String category;

    @TableField(typeHandler = PgArrayTypeHandler.class)
    private String[] tags;

    @TableField("file_url")
    private String fileUrl;

    @TableField("thumbnail_url")
    private String thumbnailUrl;

    // 为数组字段指定类型处理器
    @TableField(value = "preview_urls", typeHandler = PgArrayTypeHandler.class)
    private String[] previewUrls;

    @TableField("shader_graph_json")
    private String shaderGraphJson;

    @TableField("author_id")
    private Long authorId;

    @TableField("like_count")
    private Integer likeCount;

    @TableField("collect_count")
    private Integer collectCount;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;


}