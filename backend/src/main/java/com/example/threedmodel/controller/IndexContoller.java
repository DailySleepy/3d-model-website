package com.example.threedmodel.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController  // 返回 JSON 或字符串
public class IndexController {
    @GetMapping("/")  // 处理根路径 /
    public String home() {
        return "Hello, 3D Model Website! 后端已启动成功。";  // 测试文本
    }

    @GetMapping("/api/test")  // 可选：额外测试端点
    public String test() {
        return "{\"message\": \"API 正常\"}";
    }
}
