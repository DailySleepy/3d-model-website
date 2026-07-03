package com.example.threedmodel.dto;

import lombok.Data;

@Data
public class UploadInitRequest {
    private String fileMd5;
    private String fileName;
    private Long fileSize;
    private Integer totalChunks;
}