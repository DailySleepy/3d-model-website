package com.example.threedmodel.dto;

import lombok.Data;
import jakarta.validation.constraints.NotBlank;
import java.io.Serializable;

/**
 * 接收前端搜索参数：关键词、筛选类型、排序方式、分页参数
 */
@Data
public class SearchParamDTO implements Serializable {
    // 搜索关键词（必传）
    @NotBlank(message = "搜索关键词不能为空")
    private String q;

    // 筛选类型：model（模型）/author（作者），默认model
    private String type = "model";

    // 排序方式：hot（热门）/time（时间），默认hot
    private String sort = "hot";

    // 页码，默认1
    private Integer page = 1;

    // 每页条数，默认12
    private Integer pageSize = 12;
}
