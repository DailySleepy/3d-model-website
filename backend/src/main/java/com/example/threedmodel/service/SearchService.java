package com.example.threedmodel.service;

import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.dto.SearchParamDTO;
import com.example.threedmodel.model.entity.Model;

/**
 * 搜索业务逻辑接口
 */
public interface SearchService {
    // 执行模型/作者搜索，返回分页结果
    PageResultDTO<Model> searchModels(SearchParamDTO paramDTO);
}
