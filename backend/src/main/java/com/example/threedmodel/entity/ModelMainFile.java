package com.example.threedmodel.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("model_main_file")
public class ModelMainFile {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long modelId;
    private Long fileInfoId;
    private LocalDateTime createAt;
}