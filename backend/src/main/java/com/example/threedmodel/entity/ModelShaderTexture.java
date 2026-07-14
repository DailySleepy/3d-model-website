package com.example.threedmodel.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("model_shader_texture")
public class ModelShaderTexture {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long modelId;
    private Long fileInfoId;
    private LocalDateTime createAt;
}
