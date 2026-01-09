// backend/src/main/java/com/example/threedmodel/dto/PageResultDTO.java
package com.example.threedmodel.dto;

import lombok.Data;
import java.util.List;

@Data
public class PageResultDTO<T> {
    private List<T> items; // 数据列表
    private Long total; // 总条数
    private Integer page; // 当前页
    private Integer pageSize; // 每页条数
    private Integer totalPages; // 总页数
}