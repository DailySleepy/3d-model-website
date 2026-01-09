package com.example.threedmodel.service;

import com.example.threedmodel.dto.UserSettingsUpdateDTO;
import com.example.threedmodel.model.entity.User;

public interface UserSettingsService {

    User getUserById(Long userId);

    void updateUsername(Long userId, String username);

    void updateEmail(Long userId, String email);

    void updateAvatar(Long userId, String avatar);

    void updateBio(Long userId, String bio);

    void changePassword(Long userId, String oldPassword, String newPassword);

    void updateUserSettings(Long userId, UserSettingsUpdateDTO dto);
}