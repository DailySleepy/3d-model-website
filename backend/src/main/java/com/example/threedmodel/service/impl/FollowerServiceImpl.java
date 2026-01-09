package com.example.threedmodel.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.threedmodel.entity.Follower;
import com.example.threedmodel.event.FollowEvent;
import com.example.threedmodel.mapper.FollowerMapper;
import com.example.threedmodel.mapper.UserMapper;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.FollowerService;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FollowerServiceImpl extends ServiceImpl<FollowerMapper, Follower> implements FollowerService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public boolean follow(Long userId, Long followerId) {
        // 已关注直接返回
        if (baseMapper.selectCountByUserAndFollower(userId, followerId) > 0) {
            return false;
        }

        // 1. 保存关注关系
        Follower follower = new Follower();
        follower.setUserId(userId);
        follower.setFollowerId(followerId);
        baseMapper.insert(follower);

        // 2. 更新计数
        User targetUser = userMapper.selectById(userId);
        targetUser.setFollowersCount(targetUser.getFollowersCount() + 1);
        userMapper.updateById(targetUser);

        User currentUser = userMapper.selectById(followerId);
        currentUser.setFollowingCount(currentUser.getFollowingCount() + 1);
        userMapper.updateById(currentUser);

        // 3. 发布【关注事件】
        eventPublisher.publishEvent(
                new FollowEvent(this, followerId, userId)
        );

        return true;
    }

    @Override
    @Transactional
    public boolean unfollow(Long userId, Long followerId) {
        QueryWrapper<Follower> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("user_id", userId)
                .eq("follower_id", followerId);

        if (baseMapper.selectCount(queryWrapper) == 0) {
            return false;
        }

        baseMapper.delete(queryWrapper);

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

    /**
     * 获取某个用户的粉丝 ID 列表
     * 被发布模型事件使用
     */
    @Override
    public List<Long> getFollowerIds(Long userId) {
        return baseMapper.selectList(
                new QueryWrapper<Follower>().eq("user_id", userId)
        ).stream().map(Follower::getFollowerId).collect(Collectors.toList());
    }
}
