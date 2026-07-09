package com.example.threedmodel.service;

import com.example.threedmodel.dto.UploadInitRequest;
import com.example.threedmodel.dto.UploadInitResponse;
import org.springframework.web.multipart.MultipartFile;

public interface FileUploadService {
    UploadInitResponse initUpload(UploadInitRequest request);
    UploadInitResponse uploadChunk(String uploadId, Integer chunkIndex, MultipartFile file);
    String mergeChunks(String uploadId);
}