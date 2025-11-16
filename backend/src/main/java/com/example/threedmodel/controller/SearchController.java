package com.example.threedmodel.controller;

import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.service.SearchService;
import com.example.threedmodel.dto.SearchParamDTO;
import com.example.threedmodel.model.entity.Model;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 搜索接口：接收前端请求，调用Service处理
 */
@RestController
@RequestMapping("/api")
public class SearchController {

    @Autowired
    private SearchService searchService;

    /**
     * 核心搜索接口（适配前端 /api/search 请求）
     * 前端参数：q（关键词）、type（model/author）、sort（hot/time）、page、pageSize
     */
    @GetMapping("/search")
    public PageResultDTO<Model> searchModels(@Validated SearchParamDTO paramDTO) {
        // 调用Service执行搜索，返回分页结果
        return searchService.searchModels(paramDTO);
    }
}
