package com.example.threedmodel.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    @PostMapping("/thumbnail")
    public ResponseEntity<String> uploadThumbnail(@RequestParam("file") MultipartFile file) {
        // 保存文件到磁盘，返回 URL
        String url = saveFile(file, "/uploads/thumbnails/");
        return ResponseEntity.ok(url);
    }

    @PostMapping("/previews")
    public ResponseEntity<List<String>> uploadPreviews(@RequestParam("files") List<MultipartFile> files) {
        // 保存多文件
        List<String> urls = new ArrayList<>();
        for (MultipartFile file : files) {
            String url = saveFile(file, "/uploads/previews/");
            urls.add(url);
        }
        return ResponseEntity.ok(urls);
    }

    // 可选：上传模型文件
    @PostMapping("/model")
    public ResponseEntity<String> uploadModel(@RequestParam("file") MultipartFile file) {
        String url = saveFile(file, "/uploads/models/");
        return ResponseEntity.ok(url);
    }

    private String saveFile(MultipartFile file, String dir) {
        // 实现保存逻辑，返回访问 URL
        return dir + file.getOriginalFilename();
    }
    /*private String saveFile(MultipartFile file, String dir) throws IOException {
    // 1. 创建目录
    File folder = new File(dir);
    if (!folder.exists()) {
        folder.mkdirs();
    }

    // 2. 文件保存路径
    String filename = System.currentTimeMillis() + "_" + file.getOriginalFilename();
    File dest = new File(folder, filename);

    // 3. 保存文件
    file.transferTo(dest);

    // 4. 返回访问 URL
    return dir + filename;  // 或根据你的静态资源映射调整
    }*/
}
