package com.example.threedmodel.dto;

import lombok.Data;
import java.io.Serializable;
import java.util.List;

/**
 * 分页结果统一返回格式（适配前端接收逻辑）
 */
@Data
public class PageResultDTO<T> implements Serializable {
    // 数据列表（模型列表）
    private List<T> model;

    // 总匹配数
    private Long total;

    // 总页数
    private Integer totalPages;

    // 当前页码
    private Integer currentPage;

    // 每页条数
    private Integer pageSize;

    // 构造方法（简化创建）
    public PageResultDTO(List<T> model, Long total, Integer page, Integer pageSize) {
        this.model = model;
        this.total = total;
        this.currentPage = page;
        this.pageSize = pageSize;
        // 计算总页数（向上取整）
        this.totalPages = (int) Math.ceil((double) total / pageSize);
    }
}
