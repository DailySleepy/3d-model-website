package com.example.threedmodel.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.threedmodel.mapper.UserMapper;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserServiceImpl implements UserService {

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

}