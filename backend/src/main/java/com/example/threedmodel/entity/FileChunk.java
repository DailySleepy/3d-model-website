package com.example.threedmodel.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("file_chunk")
public class FileChunk {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String fileMd5;
    private Integer chunkIndex;
    private Long chunkSize;
    private String chunkTempPath;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createAt;
}