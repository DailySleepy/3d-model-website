// backend/src/main/java/com/example/threedmodel/service/SearchService.java
package com.example.threedmodel.service;

import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.dto.SearchParamDTO;

public interface SearchService {
    PageResultDTO<?> search(SearchParamDTO param);
}