package com.example.threedmodel.model.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("verification_codes")
public class VerificationCode {

    @TableId(value = "id")
    private String id; // UUID

    private String email;
    private String code;

    private LocalDateTime expiresAt;

    private Boolean isUsed;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
