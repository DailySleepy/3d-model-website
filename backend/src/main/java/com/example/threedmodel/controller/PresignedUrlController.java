package com.example.threedmodel.controller;

import com.example.threedmodel.dto.PresignedUrlRequest;
import com.example.threedmodel.dto.PresignedUrlResponse;
import com.example.threedmodel.entity.FileInfo;
import com.example.threedmodel.mapper.FileInfoMapper;
import com.example.threedmodel.utils.PresignedUrlUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;

@RestController
@RequestMapping("/api/presigned")
public class PresignedUrlController {

    @Autowired
    private FileInfoMapper fileInfoMapper;

    @Autowired
    private PresignedUrlUtil presignedUrlUtil;

    @Value("${app.base-url}")
    private String baseUrl;

    @Value("${app.file-root-path}")
    private String fileRootPath;

    @Value("${app.presigned.expiry-seconds:300}")
    private long expirySeconds;

    @PostMapping("/generate")
    public ResponseEntity<PresignedUrlResponse> generatePresignedUrl(
            @RequestBody PresignedUrlRequest request) {
        FileInfo fileInfo = fileInfoMapper.selectById(request.getFileId());
        if (fileInfo == null) {
            throw new RuntimeException("文件不存在");
        }

        String resourcePath = "/uploads/models/" +
                Paths.get(fileInfo.getStoragePath()).getFileName().toString();

        long expiry = Instant.now().getEpochSecond() + expirySeconds;
        String token = presignedUrlUtil.generateToken(resourcePath, expiry);

        String presignedUrl = baseUrl + "/api/presigned/access" +
                "?path=" + URLEncoder.encode(resourcePath, StandardCharsets.UTF_8) +
                "&expiry=" + expiry +
                "&token=" + token;

        PresignedUrlResponse response = new PresignedUrlResponse();
        response.setUrl(presignedUrl);
        response.setExpiresAt(expiry);
        response.setFileId(fileInfo.getId().toString());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/access")
    public ResponseEntity<Resource> accessPresignedFile(
            @RequestParam("path") String resourcePath,
            @RequestParam("expiry") long expiry,
            @RequestParam("token") String token) {

        if (!presignedUrlUtil.verifyToken(resourcePath, expiry, token)) {
            return ResponseEntity.status(403).build();
        }

        // ----- 安全防护：防止路径穿越 -----
        Path basePath = Paths.get(fileRootPath).normalize();
        // resourcePath 格式如 "/uploads/models/xxx.glb"，去掉前导 "/" 后解析
        String safeRelativePath = resourcePath.startsWith("/") ? resourcePath.substring(1) : resourcePath;
        Path requestedPath = basePath.resolve(safeRelativePath).normalize();

        if (!requestedPath.startsWith(basePath)) {
            return ResponseEntity.status(403).build(); // 非法路径
        }

        // ----- 读取文件 -----
        java.io.File file = requestedPath.toFile();
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }

        try {
            FileSystemResource resource = new FileSystemResource(file);
            return ResponseEntity.ok()
                    .header("Content-Type", guessContentType(resourcePath))
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    // ----- 全格式支持（3D + 图片） -----
    private String guessContentType(String path) {
        String lowerPath = path.toLowerCase();

        // 3D 模型
        if (lowerPath.endsWith(".glb")) return "model/gltf-binary";
        if (lowerPath.endsWith(".gltf")) return "model/gltf+json";
        if (lowerPath.endsWith(".fbx")) return "application/octet-stream";
        if (lowerPath.endsWith(".obj")) return "text/plain";
        if (lowerPath.endsWith(".stl")) return "model/stl";
        if (lowerPath.endsWith(".dae")) return "model/vnd.collada+xml";
        if (lowerPath.endsWith(".3mf")) return "application/vnd.ms-3mfdocument";
        if (lowerPath.endsWith(".blend")) return "application/octet-stream";
        if (lowerPath.endsWith(".ply")) return "application/octet-stream";

        // 图片/纹理
        if (lowerPath.endsWith(".png")) return "image/png";
        if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) return "image/jpeg";
        if (lowerPath.endsWith(".webp")) return "image/webp";
        if (lowerPath.endsWith(".gif")) return "image/gif";
        if (lowerPath.endsWith(".svg")) return "image/svg+xml";
        if (lowerPath.endsWith(".bmp")) return "image/bmp";
        if (lowerPath.endsWith(".hdr")) return "image/vnd.radiance";
        if (lowerPath.endsWith(".exr")) return "image/x-exr";

        return "application/octet-stream";
    }
}