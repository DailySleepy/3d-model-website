package com.example.threedmodel.dto;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class UploadInitRequest {
    @JsonProperty("fileMd5")
    private String fileMd5;

    @JsonProperty("fileName")
    private String fileName;

    @JsonProperty("fileSize")
    private Long fileSize;

    @JsonProperty("totalChunks")
    private Integer totalChunks;
}