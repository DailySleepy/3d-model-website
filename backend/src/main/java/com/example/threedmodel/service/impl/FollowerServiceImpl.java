package com.example.threedmodel.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.threedmodel.entity.Follower;
import com.example.threedmodel.mapper.FollowerMapper;
import com.example.threedmodel.mapper.UserMapper;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.FollowerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FollowerServiceImpl extends ServiceImpl<FollowerMapper, Follower> implements FollowerService {

    @Autowired
    private UserMapper userMapper;

    @Override
    @Transactional
    public boolean follow(Long userId, Long followerId) {
        // 检查是否已经关注
        if (baseMapper.selectCountByUserAndFollower(userId, followerId) > 0) {
            return false;
        }

        // 创建关注记录
        Follower follower = new Follower();
        follower.setUserId(userId);
        follower.setFollowerId(followerId);
        baseMapper.insert(follower);

        // 更新用户的粉丝数和关注数
        User targetUser = userMapper.selectById(userId);
        targetUser.setFollowersCount(targetUser.getFollowersCount() + 1);
        userMapper.updateById(targetUser);

        User currentUser = userMapper.selectById(followerId);
        currentUser.setFollowingCount(currentUser.getFollowingCount() + 1);
        userMapper.updateById(currentUser);

        return true;
    }

    @Override
    @Transactional
    public boolean unfollow(Long userId, Long followerId) {
        // 检查是否存在关注关系
        QueryWrapper<Follower> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId)
                .eq("follower_id", followerId);

        if (baseMapper.selectCount(queryWrapper) == 0) {
            return false;
        }

        // 删除关注记录
        baseMapper.delete(queryWrapper);

        // 更新用户的粉丝数和关注数
        User targetUser = userMapper.selectById(userId);
        targetUser.setFollowersCount(Math.max(0, targetUser.getFollowersCount() - 1));
        userMapper.updateById(targetUser);

        User currentUser = userMapper.selectById(followerId);
        currentUser.setFollowingCount(Math.max(0, currentUser.getFollowingCount() - 1));
        userMapper.updateById(currentUser);

        return true;
    }

    @Override
    public boolean isFollowing(Long userId, Long followerId) {
        return baseMapper.selectCountByUserAndFollower(userId, followerId) > 0;
    }
}