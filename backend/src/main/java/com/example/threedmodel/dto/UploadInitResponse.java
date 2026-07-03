package com.example.threedmodel.dto;

import lombok.Data;
import java.util.List;

@Data
public class UploadInitResponse {
    private String uploadId;          // 使用MD5作为标识
    private Boolean isExist;          // true表示秒传
    private String fileUrl;           // 秒传时直接返回已有文件的访问URL
    private List<Integer> uploadedChunks; // 已上传的分片索引
}