package com.example.threedmodel.service;

import java.util.List;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.threedmodel.entity.Follower;

public interface FollowerService extends IService<Follower> {
    // 关注用户
    boolean follow(Long userId, Long followerId);

    // 取消关注
    boolean unfollow(Long userId, Long followerId);

    // 检查是否已关注
    boolean isFollowing(Long userId, Long followerId);

    /**
     * 获取某个用户的所有粉丝 ID
     * 用于：作者发布模型 → 给粉丝发通知
     */
    List<Long> getFollowerIds(Long userId);
}