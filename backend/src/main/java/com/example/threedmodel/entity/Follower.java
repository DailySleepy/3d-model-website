package com.example.threedmodel.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("followers")
public class Follower {
    @TableId(type = IdType.AUTO)
    private Long id;

    // 被关注用户ID
    private Long userId;

    // 关注者ID
    private Long followerId;
}