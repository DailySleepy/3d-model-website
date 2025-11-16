package com.example.threedmodel.mapper;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.example.threedmodel.model.entity.Model;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper; // 新增：MyBatis 原生注解
import org.springframework.stereotype.Repository; // 新增：Spring 仓库组件注解
import org.apache.ibatis.annotations.Param;

// 双注解确保 Spring + MyBatis-Plus 都能识别
@Mapper
@Repository
public interface ModelMapper extends BaseMapper<Model> { // 确认泛型是 Model 实体类
    /**
     * 按模型维度搜索（名称、分类、标签）
     * @param page 分页对象
     * @param keyword 模糊关键词（已拼接%）
     * @param sort 排序方式（hot/time）
     * @return 分页模型列表
     */
    IPage<Model> searchByModel(
            Page<Model> page,
            @Param("keyword") String keyword,
            @Param("sort") String sort
    );
    /**
     * 按作者维度搜索（用户名模糊匹配）
     * @param page 分页对象
     * @param authorName 作者名模糊关键词（已拼接%）
     * @param sort 排序方式（hot/time）
     * @return 分页模型列表
     */

    IPage<Model> searchByAuthor(
            Page<Model> page,
            @Param("authorName") String authorName,
            @Param("sort") String sort
    );
}
