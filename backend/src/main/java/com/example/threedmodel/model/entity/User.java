package com.example.threedmodel.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("users")
public class User {
    private Long id;
    private String email;
    private String username;
    private String passwordHash;
    private String avatar;
    private String bio;
    private LocalDateTime createdAt;
}