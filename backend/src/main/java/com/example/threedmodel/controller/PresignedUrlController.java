package com.example.threedmodel.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.threedmodel.dto.PresignedUrlRequest;
import com.example.threedmodel.dto.PresignedUrlResponse;
import com.example.threedmodel.entity.FileInfo;
import com.example.threedmodel.entity.ModelMainFile;
import com.example.threedmodel.mapper.FileInfoMapper;
import com.example.threedmodel.mapper.ModelMainFileMapper;
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
    private ModelMainFileMapper modelMainFileMapper;  // 新增注入

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

        Long fileId = request.getFileId();
        Long modelId = request.getModelId();
        FileInfo fileInfo = null;

        // 1. 优先使用 fileId
        if (fileId != null) {
            fileInfo = fileInfoMapper.selectById(fileId);
        }
        // 2. 如果 fileId 为空，尝试通过 modelId 查询
        else if (modelId != null) {
            LambdaQueryWrapper<ModelMainFile> wrapper = new LambdaQueryWrapper<>();
            wrapper.eq(ModelMainFile::getModelId, modelId);
            ModelMainFile relation = modelMainFileMapper.selectOne(wrapper);
            if (relation != null) {
                fileInfo = fileInfoMapper.selectById(relation.getFileInfoId());
            }else {
                // 表为空或未关联时的友好提示
                throw new RuntimeException("未找到该模型对应的文件，请使用 fileId 或先执行数据迁移");
            }
        }else {
            throw new RuntimeException("请提供 fileId 或 modelId");
        }

        if (fileInfo == null) {
            throw new RuntimeException("文件不存在，请提供有效的 fileId 或 modelId");
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
        String safeRelativePath = resourcePath.startsWith("/") ? resourcePath.substring(1) : resourcePath;
        Path requestedPath = basePath.resolve(safeRelativePath).normalize();

        if (!requestedPath.startsWith(basePath)) {
            return ResponseEntity.status(403).build();
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