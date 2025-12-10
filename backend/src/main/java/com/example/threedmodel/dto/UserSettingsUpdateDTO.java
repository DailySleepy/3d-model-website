package com.example.threedmodel.dto;

import lombok.Data;

@Data
public class UserSettingsUpdateDTO {
    private String username;
    private String email;
    private String avatar;
    private String bio;
}
