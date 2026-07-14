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



    @TableField("author_id")
    private Long authorId;

    @TableField("like_count")
    private Integer likeCount;

    @TableField("collect_count")
    private Integer collectCount;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;


}