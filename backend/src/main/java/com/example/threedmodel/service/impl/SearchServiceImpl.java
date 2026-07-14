// backend/src/main/java/com/example/threedmodel/service/impl/SearchServiceImpl.java
package com.example.threedmodel.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.dto.SearchParamDTO;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.mapper.SearchMapper;
import com.example.threedmodel.model.entity.User;
import com.example.threedmodel.service.ModelService;
import com.example.threedmodel.service.SearchService;
import com.example.threedmodel.vo.ModelVO;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class SearchServiceImpl implements SearchService {

    @Resource
    private SearchMapper searchMapper;

    @Resource
    private ModelService modelService;

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
            List<ModelVO> vos = modelService.toVOList(modelPage.getRecords());
            return buildPageResult(modelPage, vos, param);
        }
    }

    // 构建分页结果 (直接使用 Page 的原始记录)
    private <T> PageResultDTO<T> buildPageResult(Page<T> page, SearchParamDTO param) {
        return buildPageResult(page, page.getRecords(), param);
    }

    // 重载构建分页结果 (支持自定义传入映射后的列表，如 ModelVO)
    private <T, R> PageResultDTO<R> buildPageResult(Page<T> page, List<R> items, SearchParamDTO param) {
        PageResultDTO<R> result = new PageResultDTO<>();
        result.setItems(items);
        result.setTotal(page.getTotal());
        result.setPage(param.getPage());
        result.setPageSize(param.getPageSize());
        result.setTotalPages((int) page.getPages());
        return result;
    }
}