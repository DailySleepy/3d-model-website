// backend/src/main/java/com/example/threedmodel/dto/PageResultDTO.java
package com.example.threedmodel.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PageResultDTO<T> {
    private List<T> items; // 数据列表
    private Long total; // 总条数
    private Long totalLevel1; // 1级总条数
    private Integer page; // 当前页
    private Integer pageSize; // 每页条数
    private Integer totalPages; // 总页数

    public PageResultDTO(List<T> items, long total, int page, int pageSize) {
        this.items = items;
        this.total = total;
        this.page = page;
        this.pageSize = pageSize;
        this.totalPages = (int) Math.ceil((double) total / pageSize);
    }

}