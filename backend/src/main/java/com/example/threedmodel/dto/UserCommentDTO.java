package com.example.threedmodel.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserCommentDTO {
    private Long id;
    private Long modelId;
    private String modelTitle;
    private String modelThumbnailUrl;
    private String content;
    private LocalDateTime createdAt;
}
