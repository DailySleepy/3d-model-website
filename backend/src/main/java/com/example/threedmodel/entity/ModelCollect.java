package com.example.threedmodel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("model_collect")
public class ModelCollect {
    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private Long modelId;

    private LocalDateTime createdAt;
}
