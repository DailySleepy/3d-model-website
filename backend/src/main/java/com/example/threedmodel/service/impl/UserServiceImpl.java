package com.example.threedmodel.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.threedmodel.entity.Follower;
import com.example.threedmodel.mapper.FollowerMapper;
import com.example.threedmodel.mapper.UserMapper;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.FollowerService;
import com.example.threedmodel.service.UserService;

import lombok.Builder.ObtainVia;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @Autowired
    private UserMapper userMapper;

    @Override
    public User findByEmailOrUsername(String identifier) {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        wrapper.eq("email", identifier).or().eq("username", identifier);
        return userMapper.selectOne(wrapper);
    }
    @Override
    public User getUserByUsername(String username) {
        QueryWrapper<User> wrapper = new QueryWrapper<>();
        // 仅匹配username字段，比原有方法更精准
        wrapper.eq("username", username);
        return userMapper.selectOne(wrapper);
    }

    @Override
    public boolean updatePassword(String email, String newHashedPassword) {
        return this.update(
                new LambdaUpdateWrapper<User>()
                        .eq(User::getEmail, email)
                        .set(User::getPasswordHash, newHashedPassword)
        );
    }

    @Override
    public User getByEmail(String email) {
        return this.getOne(
                new LambdaQueryWrapper<User>()
                        .eq(User::getEmail, email)
                        .last("LIMIT 1")
        );
    }

    @Override
    public User getByEmailOrUsername(String identifier) {
        return this.getOne(
                new LambdaQueryWrapper<User>()
                        .eq(User::getEmail, identifier)
                        .or()
                        .eq(User::getUsername, identifier)
                        .last("LIMIT 1")
        );
    }


}