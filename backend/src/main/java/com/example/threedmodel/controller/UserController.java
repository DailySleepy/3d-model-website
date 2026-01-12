package com.example.threedmodel.controller;

import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.dto.UserCommentDTO;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.CommentService;
import com.example.threedmodel.service.ModelCollectService;
import com.example.threedmodel.service.UserService;
import jakarta.annotation.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Resource
    private UserService userService;

    @Resource
    private CommentService commentService;

    @Resource
    private ModelCollectService modelCollectService;

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        User user = userService.getById(id);
        if (user == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("用户不存在");
        }
        return ResponseEntity.ok(user);
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<PageResultDTO<UserCommentDTO>> getUserComments(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        if (page < 1 || size < 1 || size > 50) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(commentService.getCommentsByUserId(id, page, size));
    }

    @GetMapping("/{id}/collections")
    public ResponseEntity<PageResultDTO<Model>> getUserCollections(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int size) {
        if (page < 1 || size < 1 || size > 50) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(modelCollectService.getCollectedModels(id, page, size));
    }
}
