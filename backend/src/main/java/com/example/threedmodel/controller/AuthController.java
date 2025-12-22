package com.example.threedmodel.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.model.entity.VerificationCode;
import com.example.threedmodel.service.UserService;
import com.example.threedmodel.service.VerificationCodeService;
import com.example.threedmodel.utils.EmailUtil;
import com.example.threedmodel.utils.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    @Autowired
    private VerificationCodeService codeService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private EmailUtil emailUtil;

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
        resp.put("id", user.getId());
        resp.put("username", user.getUsername());
        resp.put("email", user.getEmail());
        resp.put("avatar", user.getAvatar());
        return resp;
    }

    // -------------------------
    // 发送验证码
    // -------------------------
    @PostMapping("/send-code")
    public ResponseEntity<?> sendCode(@RequestBody Map<String, String> req) {

        String email = req.get("email");
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body("Email cannot be empty");
        }

        // 生成 6 位数字验证码
        String code = String.valueOf((int)((Math.random() * 9 + 1) * 100000));

        // 存入数据库
        codeService.createCode(email, code);

        // 发送邮件
        emailUtil.sendEmail(email, "Your Verification Code",
                "Your verification code is: " + code + "\n" +
                        "Valid for 10 minutes.");

        return ResponseEntity.ok("Verification code sent");
    }

    // -------------------------
    // 注册
    // -------------------------
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> req) {

        String email = req.get("email");
        String username = req.get("username");
        String password = req.get("password");
        String code = req.get("code");

        if (email == null || username == null || password == null || code == null) {
            return ResponseEntity.badRequest().body("Missing parameters");
        }

        // 校验验证码
        VerificationCode vc = codeService.validateCode(email, code);
        if (vc == null) {
            return ResponseEntity.badRequest().body("Invalid or expired verification code");
        }

        // 判断用户是否存在
        User exists = userService.findByEmailOrUsername(email);
        if (exists != null) {
            return ResponseEntity.badRequest().body("User already exists");
        }

        // 创建用户
        User user = new User();
        user.setEmail(email);
        user.setUsername(username);
        user.setPasswordHash(BCrypt.hashpw(password, BCrypt.gensalt()));
        user.setAvatar(null);
        user.setBio("");

        userService.save(user);

        return ResponseEntity.ok("Registered successfully");
    }

    // -------------------------
    // 忘记密码（发送验证码）
    // -------------------------
    @PostMapping("/forgot")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> req) {

        String email = req.get("email");
        if (email == null) {
            return ResponseEntity.badRequest().body("Email cannot be empty");
        }

        // 是否存在该用户
        User user = userService.getOne(new QueryWrapper<User>().eq("email", email));
        if (user == null) {
            return ResponseEntity.badRequest().body("Email not registered");
        }

        // 生成验证码
        String code = String.valueOf((int)((Math.random() * 9 + 1) * 100000));
        codeService.createCode(email, code);

        emailUtil.sendEmail(email, "Password Reset Code",
                "Your reset code is: " + code + "\nValid for 10 minutes.");

        return ResponseEntity.ok("Reset code sent to email");
    }

    // -------------------------
    // 重置密码
    // -------------------------
    @PostMapping("/reset")
    public Map<String, Object> resetPassword(@RequestBody Map<String, String> req) {

        String email = req.get("email");
        String newPassword = req.get("newPassword");

        Map<String, Object> resp = new HashMap<>();

        User user = userService.getByEmail(email);
        if (user == null) {
            resp.put("code", 404);
            resp.put("msg", "用户不存在");
            return resp;
        }

        // BCrypt hash
        String hashed = BCrypt.hashpw(newPassword, BCrypt.gensalt());

        boolean ok = userService.updatePassword(email, hashed);

        if (ok) {
            resp.put("code", 200);
            resp.put("msg", "密码重置成功");
        } else {
            resp.put("code", 500);
            resp.put("msg", "更新失败");
        }

        return resp;
    }


}
