package com.example.threedmodel.service.impl;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.example.threedmodel.dto.UserSettingsUpdateDTO;
import com.example.threedmodel.mapper.UserMapper;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.UserSettingsService;
import jakarta.annotation.Resource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserSettingsServiceImpl implements UserSettingsService {

    @Resource
    private UserMapper userMapper;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public User getUserById(Long userId) {
        return userMapper.selectById(userId);
    }

    @Override
    public void updateUsername(Long userId, String username) {
        LambdaUpdateWrapper<User> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(User::getId, userId).set(User::getUsername, username);
        userMapper.update(null, wrapper);
    }

    @Override
    public void updateEmail(Long userId, String email) {
        LambdaUpdateWrapper<User> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(User::getId, userId).set(User::getEmail, email);
        userMapper.update(null, wrapper);
    }

    @Override
    public void updateAvatar(Long userId, String avatar) {
        LambdaUpdateWrapper<User> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(User::getId, userId).set(User::getAvatar, avatar);
        userMapper.update(null, wrapper);
    }

    @Override
    public void updateBio(Long userId, String bio) {
        LambdaUpdateWrapper<User> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(User::getId, userId).set(User::getBio, bio);
        userMapper.update(null, wrapper);
    }

    @Override
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        User user = userMapper.selectById(userId);

        if (user == null) {
            throw new RuntimeException("User not found");
        }

        // 注意你用的字段是 passwordHash
        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new RuntimeException("Old password is incorrect");
        }

        String newHash = passwordEncoder.encode(newPassword);

        LambdaUpdateWrapper<User> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(User::getId, userId).set(User::getPasswordHash, newHash);

        userMapper.update(null, wrapper);
    }

    public void updateUserSettings(Long userId, UserSettingsUpdateDTO dto) {

        User user = new User();
        user.setId(userId);
        user.setUsername(dto.getUsername());
        user.setEmail(dto.getEmail());
        user.setAvatar(dto.getAvatar());
        user.setBio(dto.getBio());

        userMapper.updateById(user);
    }
}