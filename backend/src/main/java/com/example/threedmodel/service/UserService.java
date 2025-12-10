package com.example.threedmodel.service;


import com.baomidou.mybatisplus.extension.service.IService;
import com.example.threedmodel.entity.Follower;
import com.example.threedmodel.model.entity.User;

public interface UserService extends IService<User> {
    User findByEmailOrUsername(String identifier);
    User getUserByUsername(String username);

    boolean updatePassword(String email, String newHashedPassword);

    User getByEmail(String email);

    User getByEmailOrUsername(String identifier);
}
