package com.example.threedmodel.vo;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ModelVO {
    private Long id;
    private String title;
    private String description;
    private String category;
    private String[] tags;
    private String fileUrl;
    private String thumbnailUrl;
    private String[] previewUrls;
    private Long authorId;
    private Integer likeCount;
    private Integer collectCount;
    private LocalDateTime createdAt;
}
