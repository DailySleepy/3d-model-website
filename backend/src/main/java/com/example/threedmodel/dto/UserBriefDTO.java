package com.example.threedmodel.dto;

import lombok.Data;

/**
 * 通知中使用的用户简要信息
 */
@Data
public class UserBriefDTO {

    private Long id;
    private String username;
    private String avatar;
}
