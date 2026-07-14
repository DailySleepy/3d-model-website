package com.example.threedmodel.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("model_preview_file")
public class ModelPreviewFile {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long modelId;
    private Long fileInfoId;
    private Integer sort;
    private LocalDateTime createAt;
}
