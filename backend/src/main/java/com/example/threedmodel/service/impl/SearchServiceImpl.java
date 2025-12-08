package com.example.threedmodel.service.impl;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.dto.SearchParamDTO;
import com.example.threedmodel.model.entity.Model;
import com.example.threedmodel.mapper.SearchMapper;
import com.example.threedmodel.mapper.UserMapper;
import com.example.threedmodel.service.SearchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 搜索业务逻辑实现：区分筛选类型、排序方式，调用Mapper查询
 */
@Service
public class SearchServiceImpl implements SearchService {

    @Autowired
    private SearchMapper searchMapper;

    @Autowired
    private UserMapper userMapper;

    @Override
    public PageResultDTO<Model> searchModels(SearchParamDTO paramDTO) {
        // 1. 构建分页对象（MyBatis-Plus分页）
        Page<Model> page = new Page<>(paramDTO.getPage(), paramDTO.getPageSize());

        // 2. 区分筛选类型：搜索模型 / 搜索作者
        IPage<Model> resultPage;
        String keyword = "%" + paramDTO.getQ().trim() + "%"; // 模糊查询拼接%

        if ("author".equals(paramDTO.getType())) {
            // 2.1 搜索作者：按用户名模糊匹配，查询该作者的所有模型
            resultPage = searchMapper.searchByAuthor(page, keyword, paramDTO.getSort());
        } else {
            // 2.2 搜索模型：按名称、分类、标签模糊匹配
            resultPage = searchMapper.searchByModel(page, keyword, paramDTO.getSort());
        }

        // 3. 封装分页结果返回
        return new PageResultDTO<>(
                resultPage.getRecords(),
                resultPage.getTotal(),
                paramDTO.getPage(),
                paramDTO.getPageSize()
        );
    }
}
