// backend/src/main/java/com/example/threedmodel/mapper/SearchMapper.java
package com.example.threedmodel.mapper;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.model.entity.User;
import org.apache.ibatis.annotations.Param;

public interface SearchMapper {

    /**
     * 搜索模型
     * @param page 分页对象
     * @param q 搜索关键词
     * @param sort 排序方式
     * @return 分页结果
     */
    IPage<Model> searchModels(Page<Model> page,
                              @Param("q") String q,
                              @Param("sort") String sort);

    /**
     * 搜索用户
     * @param page 分页对象
     * @param q 搜索关键词
     * @param sort 排序方式
     * @return 分页结果
     */
    IPage<User> searchUsers(Page<User> page,
                            @Param("q") String q,
                            @Param("sort") String sort);
}