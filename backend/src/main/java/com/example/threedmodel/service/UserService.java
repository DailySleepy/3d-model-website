package com.example.threedmodel.service;


import com.example.threedmodel.model.entity.User;

public interface UserService {
    User findByEmailOrUsername(String identifier);
}
