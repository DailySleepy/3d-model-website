package com.example.threedmodel.controller;

import com.example.threedmodel.dto.ModelCreateDTO;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.ModelService;
import com.example.threedmodel.service.UserService;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/models")
public class ModelController {

    @Autowired
    private ModelService modelService;

    @Resource
    private UserService userService;


    @PostMapping
    public Object publishModel(@RequestBody ModelCreateDTO dto) {
        Long id = modelService.publishModel(dto);
        return new Response(id, "发布成功");
    }

    record Response(Long id, String message) {}

    @GetMapping
    public ResponseEntity<?> getModels(
            @RequestParam(required = false) Long authorId
    ) {
        if (authorId == null) {
            return ResponseEntity.badRequest().body("缺少 authorId");
        }

        List<Model> models = modelService.getModelsByAuthor(authorId);


        return ResponseEntity.ok(models);
    }

}
