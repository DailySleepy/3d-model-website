// backend/src/main/java/com/example/threedmodel/service/impl/SearchServiceImpl.java
package com.example.threedmodel.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.dto.SearchParamDTO;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.mapper.SearchMapper;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.SearchService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

@Service
public class SearchServiceImpl implements SearchService {

    @Resource
    private SearchMapper searchMapper;

    @Override
    public PageResultDTO<?> search(SearchParamDTO param) {
        // 构建分页对象
        Page<?> page = new Page<>(param.getPage(), param.getPageSize());

        // 根据类型执行不同搜索
        if ("author".equals(param.getType())) {
            Page<User> userPage = (Page<User>) searchMapper.searchUsers(
                    (Page<User>) page,
                    param.getQ(),
                    param.getSort()
            );
            return buildPageResult(userPage, param);
        } else {
            // 默认搜索模型
            Page<Model> modelPage = (Page<Model>) searchMapper.searchModels(
                    (Page<Model>) page,
                    param.getQ(),
                    param.getSort()
            );
            return buildPageResult(modelPage, param);
        }
    }

    // 构建分页结果
    private <T> PageResultDTO<T> buildPageResult(Page<T> page, SearchParamDTO param) {
        PageResultDTO<T> result = new PageResultDTO<>();
        result.setItems(page.getRecords());
        result.setTotal(page.getTotal());
        result.setPage(param.getPage());
        result.setPageSize(param.getPageSize());
        result.setTotalPages((int) page.getPages());
        return result;
    }
}