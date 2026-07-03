package com.example.threedmodel.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

@Data
public class UploadChunkRequest {
    private String uploadId;
    private Integer chunkIndex;
    private MultipartFile file;
}