package com.example.threedmodel.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("model_shader_graph")
public class ModelShaderGraph {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long modelId;
    private String shaderGraphJson;
    private LocalDateTime updateAt;
}
