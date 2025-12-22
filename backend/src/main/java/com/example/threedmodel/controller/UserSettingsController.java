package com.example.threedmodel.controller;

import com.example.threedmodel.dto.*;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.UserSettingsService;
import jakarta.annotation.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.UUID;

@RestController
@RequestMapping("/api/settings/user")
@CrossOrigin
public class UserSettingsController {

    @Resource
    private UserSettingsService userSettingsService;

    @PatchMapping
    public ResponseEntity<String> updateUserSettings(
            @RequestParam Long userId,
            @RequestBody UserSettingsUpdateDTO dto) {

        userSettingsService.updateUserSettings(userId, dto);
        return ResponseEntity.ok("User settings updated");
    }


    /** 更新用户名 */
    @PatchMapping("/username")
    public ResponseEntity<String> updateUsername(@RequestParam Long userId,
                                                 @RequestBody UpdateUsernameRequest req) {
        userSettingsService.updateUsername(userId, req.getUsername());
        return ResponseEntity.ok("Username updated");
    }

    /** 更新邮箱 */
    @PatchMapping("/email")
    public ResponseEntity<String> updateEmail(@RequestParam Long userId,
                                              @RequestBody UpdateEmailRequest req) {
        userSettingsService.updateEmail(userId, req.getEmail());
        return ResponseEntity.ok("Email updated");
    }

    /** 更新头像（使用 URL） */
    @PatchMapping("/avatar")
    public ResponseEntity<String> updateAvatar(@RequestParam Long userId,
                                               @RequestBody UpdateAvatarRequest req) {
        userSettingsService.updateAvatar(userId, req.getAvatar());
        return ResponseEntity.ok("Avatar updated");
    }

    /** 更新简介 */
    @PatchMapping("/bio")
    public ResponseEntity<String> updateBio(@RequestParam Long userId,
                                            @RequestBody UpdateBioRequest req) {
        userSettingsService.updateBio(userId, req.getBio());
        return ResponseEntity.ok("Bio updated");
    }

    /** 修改密码 */
    @PostMapping("/password")
    public ResponseEntity<String> changePassword(@RequestParam Long userId,
                                                 @RequestBody UpdatePasswordRequest req) {
        userSettingsService.changePassword(
                userId,
                req.getOldPassword(),
                req.getNewPassword()
        );
        return ResponseEntity.ok("Password changed successfully");
    }

    /** 头像文件上传接口 */
    @PostMapping("/avatar/upload")
    public ResponseEntity<String> uploadAvatar(@RequestParam("file") MultipartFile file) {
        // 你需要实现 saveFile()
        String url = saveFile(file, "/uploads/avatars/");
        return ResponseEntity.ok(url);
    }

    /** 保存文件方法（你可以放到工具类） */
    private String saveFile(MultipartFile file, String relativePath) {

        // 1. 生成唯一文件名
        String originalName = file.getOriginalFilename();
        String ext = originalName.substring(originalName.lastIndexOf("."));
        String fileName = UUID.randomUUID() + ext;

        String uploadBasePath = System.getProperty("user.dir") + relativePath;

        File dir = new File(uploadBasePath);
        if (!dir.exists()) {
            dir.mkdirs();
        }

        // 3. 目标文件
        File dest = new File(uploadBasePath + fileName);

        try {
            // 保存文件到磁盘
            file.transferTo(dest);
        } catch (Exception e) {
            throw new RuntimeException("File upload failed: " + e.getMessage());
        }

        return "http://localhost:8080" + relativePath + fileName;
    }
}
