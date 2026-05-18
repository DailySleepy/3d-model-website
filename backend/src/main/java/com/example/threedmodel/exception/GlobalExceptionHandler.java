package com.example.threedmodel.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局异常处理器
 * 用于捕获后端在业务层/控制层抛出的所有未捕获异常，并统一转换为规范的 HTTP 响应
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> handleRuntimeException(RuntimeException e) {
        if (e.getClass() == RuntimeException.class) {
            // 1. 开发者手动显式 throw new RuntimeException("业务错误提示") 抛出的业务异常
            // 返回 400 Bad Request 和友好文本
            return ResponseEntity.badRequest().body(e.getMessage());
        }
        // 2. 属于 RuntimeException 的派生子类（如 NullPointerException、IndexOutOfBoundsException 等）
        // 代表真正的系统 Bug 或数据库崩溃，直接重新抛出，让 Spring Boot 默认抛出 500 Internal Server Error 并不被遮盖！
        throw e;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgumentException(IllegalArgumentException e) {
        // 捕获非法参数异常，返回 400 Bad Request
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}
