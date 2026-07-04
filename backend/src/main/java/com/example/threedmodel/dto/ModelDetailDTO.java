package com.example.threedmodel.dto;

import lombok.Data;

@Data
public class ModelDetailDTO {
    private Long id;
    private Long authorId;
    private String title;
    private String description;
    private String category;
    private String[] tags;
    private String fileUrl;
    private String thumbnailUrl;
    private String[] previewUrls;
    private String shaderGraphJson;
    private int likeCount;
    private int collectCount;
    private boolean likedByUser;
    private boolean collectedByUser;
}
