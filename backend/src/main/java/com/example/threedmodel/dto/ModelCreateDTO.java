package com.example.threedmodel.dto;

import lombok.Data;


@Data
public class ModelCreateDTO {
    private String title;
    private String description;
    private String category;
    private String[] tags;
    private String fileUrl;
    private String thumbnailUrl;
    private String[] previewUrls;
}
