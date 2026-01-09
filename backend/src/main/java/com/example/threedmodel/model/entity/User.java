package com.example.threedmodel.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("users")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String email;
    private String username;
    private String passwordHash;
    private String avatar;
    private String bio;

    // 新增关注相关字段
    @TableField("followers_count")
    private Integer followersCount = 0;  // 粉丝数

    @TableField("following_count")
    private Integer followingCount = 0;  // 关注数

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;

    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;

}