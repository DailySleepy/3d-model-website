package com.example.threedmodel.controller;

import com.example.threedmodel.dto.ModelCreateDTO;
import com.example.threedmodel.service.ModelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/models")
public class ModelController {

    @Autowired
    private ModelService modelService;

    @PostMapping
    public Object publishModel(@RequestBody ModelCreateDTO dto) {
        Long id = modelService.publishModel(dto);
        return new Response(id, "发布成功");
    }

    record Response(Long id, String message) {}
}
