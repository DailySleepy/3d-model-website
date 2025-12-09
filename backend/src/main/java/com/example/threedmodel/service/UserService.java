package com.example.threedmodel.service;


import com.baomidou.mybatisplus.extension.service.IService;
import com.example.threedmodel.entity.Follower;
import com.example.threedmodel.model.entity.User;

public interface UserService extends IService<User> {
    User findByEmailOrUsername(String identifier);
    User getUserByUsername(String username);
}
