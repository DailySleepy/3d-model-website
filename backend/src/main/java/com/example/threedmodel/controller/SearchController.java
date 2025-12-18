// backend/src/main/java/com/example/threedmodel/controller/SearchController.java
package com.example.threedmodel.controller;

import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.dto.SearchParamDTO;
import com.example.threedmodel.service.SearchService;
import jakarta.annotation.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    @Resource
    private SearchService searchService;

    @GetMapping
    public ResponseEntity<PageResultDTO<?>> search(SearchParamDTO param) {
        return ResponseEntity.ok(searchService.search(param));
    }
}