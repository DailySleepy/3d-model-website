package com.example.threedmodel.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    // 从application.yml中注入路径
    @Value("${app.file-root-path}")
    private String fileRootPath;

    @Value("${app.base-url}")
    private String baseUrl;

    /** 上传封面图 */
    @PostMapping("/thumbnail")
    public ResponseEntity<String> uploadThumbnail(@RequestParam("file") MultipartFile file) {
        String url = saveFile(file, "/uploads/thumbnails/");
        return ResponseEntity.ok(url);
    }

    /** 上传预览图（多张） */
    @PostMapping("/previews")
    public ResponseEntity<List<String>> uploadPreviews(@RequestParam("files") List<MultipartFile> files) {
        List<String> urls = new ArrayList<>();
        for (MultipartFile file : files) {
            urls.add(saveFile(file, "/uploads/previews/"));
        }
        return ResponseEntity.ok(urls);
    }

    /** 上传模型文件 */
    @PostMapping("/model")
    public ResponseEntity<String> uploadModel(@RequestParam("file") MultipartFile file) {
        String url = saveFile(file, "/uploads/models/");
        return ResponseEntity.ok(url);
    }

    /**
     * 核心：保存文件到本地磁盘
     */
    private String saveFile(MultipartFile file, String relativeDir) {
        try {
            // 1. 生成唯一文件名
            String originalName = file.getOriginalFilename();
            String suffix = originalName.substring(originalName.lastIndexOf("."));
            String fileName = UUID.randomUUID() + suffix;

            // 2. 拼接路径
            String fullDirPath = fileRootPath + relativeDir;

            File dir = new File(fullDirPath);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            // 3. 保存文件
            File dest = new File(dir, fileName);
            file.transferTo(dest);

            // 4. 返回访问 URL（前端可直接用）
            return baseUrl + relativeDir + fileName;

        } catch (Exception e) {
            throw new RuntimeException("文件上传失败：" + e.getMessage());
        }
    }
}
