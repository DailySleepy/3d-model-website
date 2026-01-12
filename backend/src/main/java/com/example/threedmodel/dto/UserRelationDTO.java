package com.example.threedmodel.dto;

import lombok.Data;

@Data
public class UserRelationDTO {
    private Long id;
    private String username;
    private String avatar;
    private boolean following;
}
