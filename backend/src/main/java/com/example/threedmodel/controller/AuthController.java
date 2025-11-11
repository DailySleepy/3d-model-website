package com.example.threedmodel.controller;

import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.UserService;
import com.example.threedmodel.utils.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> req) {
        String identifier = req.get("identifier"); // 邮箱或用户名
        String password = req.get("password");

        User user = userService.findByEmailOrUsername(identifier);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }

        if (!BCrypt.checkpw(password, user.getPasswordHash())) {
            throw new RuntimeException("密码错误");
        }

        String token = jwtUtil.generateToken(user.getUsername());
        Map<String, Object> resp = new HashMap<>();
        resp.put("token", token);
        resp.put("username", user.getUsername());
        resp.put("email", user.getEmail());
        resp.put("avatar", user.getAvatar());
        return resp;
    }
}