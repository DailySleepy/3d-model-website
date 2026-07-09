package com.example.threedmodel.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("file_info")
public class FileInfo {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String fileMd5;
    private String originalName;
    private Long fileSize;
    private String fileSuffix;
    private String storagePath;
    private Integer convertStatus; // 0-未处理 1-转换中 2-成功 3-失败
    private String glbConvertPath;
    private String thumbnailPath;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updateAt;
}
