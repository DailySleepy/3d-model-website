package com.example.threedmodel.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import org.apache.ibatis.type.ArrayTypeHandler;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("models")
public class Model {

    @TableId(type = IdType.AUTO)
    //确定id是int还是long类型？
    private Integer id;
    
    private String title;
    private String description;
    private String category;

    // 为数组字段指定类型处理器
    @TableField(typeHandler = ArrayTypeHandler.class)
    private String[] tags;

    @TableField("file_url")
    private String fileUrl;

    @TableField("thumbnail_url")
    private String thumbnailUrl;

    // 为数组字段指定类型处理器
    @TableField(value = "preview_urls", typeHandler = ArrayTypeHandler.class)
    private String[] previewUrls;

    // 其他字段保持不变...
    @TableField("author_id")
    private Long authorId;

    @TableField("like_count")
    private Integer likeCount;

    @TableField("collect_count")
    private Integer collectCount;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    private String authorName;
}
