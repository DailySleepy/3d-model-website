//这是一个模拟测试
package com.example.threedmodel.utils;

import com.example.threedmodel.entity.FileInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Paths;

@Component
public class ConverterUtil {

    @Value("${app.file-root-path}")
    private String fileRootPath;

    /**
     * 模拟格式转换：假设源文件为 obj，转换为 glb
     * 实际可调用 ProcessBuilder 执行 obj2gltf 命令
     */
    public String convertToGlb(FileInfo fileInfo) throws Exception {
        // 假设 storage_path 是原始文件路径
        String sourcePath = fileInfo.getStoragePath();
        // 生成目标路径：将后缀替换为 .glb
        String targetPath = sourcePath.replaceAll("\\.(obj|fbx|stl)$", ".glb");
        File targetFile = new File(targetPath);
        // 模拟转换：如果文件不存在，复制一份或创建空文件（演示）
        if (!targetFile.exists()) {
            // 实际应该调用 obj2gltf -i source -o target
            // 这里模拟创建空文件（实际开发时应替换为真实命令）
            targetFile.createNewFile();
            System.out.println("模拟转换: " + sourcePath + " -> " + targetPath);
        }
        return targetPath;
    }

    /**
     * 生成缩略图：使用无头浏览器截图（模拟）
     * 实际可调用 Puppeteer 或使用 Java 渲染引擎
     */
    public String generateThumbnail(FileInfo fileInfo, String glbPath) throws Exception {
        // 生成缩略图路径：放在 uploads/thumbnails/ 下，文件名同 glb 但扩展名为 .png
        String thumbnailDir = fileRootPath + "/uploads/thumbnails/";
        File dir = new File(thumbnailDir);
        if (!dir.exists()) dir.mkdirs();

        String fileName = Paths.get(glbPath).getFileName().toString().replaceAll("\\.[^.]+$", ".png");
        String thumbnailPath = thumbnailDir + fileName;
        File thumbFile = new File(thumbnailPath);
        // 模拟生成：创建空文件（实际应执行截图）
        if (!thumbFile.exists()) {
            thumbFile.createNewFile();
            System.out.println("模拟生成缩略图: " + thumbnailPath);
        }
        return thumbnailPath;
    }
}
// 实际转换方法
//public String convertToGlb(FileInfo fileInfo) throws Exception {
//    String sourcePath = fileInfo.getStoragePath();
//    String targetPath = sourcePath.replaceAll("\\.[^.]+$", ".glb");
//    ProcessBuilder pb = new ProcessBuilder(
//            "obj2gltf", "-i", sourcePath, "-o", targetPath
//    );
//    Process process = pb.start();
//    int exitCode = process.waitFor();
//    if (exitCode != 0) {
//        throw new RuntimeException("obj2gltf 转换失败，退出码: " + exitCode);
//    }
//    return targetPath;
//}