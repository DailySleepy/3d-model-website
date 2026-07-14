package com.example.threedmodel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.threedmodel.entity.Model;
import org.apache.ibatis.annotations.Mapper;

import org.apache.ibatis.annotations.*;
import java.util.List;

@Mapper
public interface ModelMapper extends BaseMapper<Model> {

    @Select("<script>" +
            "SELECT mmf.model_id, fi.storage_path " +
            "FROM model_main_file mmf " +
            "JOIN file_info fi ON mmf.file_info_id = fi.id " +
            "WHERE mmf.model_id IN " +
            "<foreach item='item' index='index' collection='modelIds' open='(' separator=',' close=')'>" +
            "#{item}" +
            "</foreach>" +
            "</script>")
    @Results({
            @Result(column = "model_id", property = "modelId"),
            @Result(column = "storage_path", property = "storagePath")
    })
    List<ModelFileMapping> selectMainFiles(@Param("modelIds") List<Long> modelIds);

    @Select("<script>" +
            "SELECT mtf.model_id, fi.storage_path " +
            "FROM model_thumbnail_file mtf " +
            "JOIN file_info fi ON mtf.file_info_id = fi.id " +
            "WHERE mtf.model_id IN " +
            "<foreach item='item' index='index' collection='modelIds' open='(' separator=',' close=')'>" +
            "#{item}" +
            "</foreach>" +
            "</script>")
    @Results({
            @Result(column = "model_id", property = "modelId"),
            @Result(column = "storage_path", property = "storagePath")
    })
    List<ModelFileMapping> selectThumbnails(@Param("modelIds") List<Long> modelIds);

    @Select("<script>" +
            "SELECT mpf.model_id, fi.storage_path, mpf.sort " +
            "FROM model_preview_file mpf " +
            "JOIN file_info fi ON mpf.file_info_id = fi.id " +
            "WHERE mpf.model_id IN " +
            "<foreach item='item' index='index' collection='modelIds' open='(' separator=',' close=')'>" +
            "#{item}" +
            "</foreach> " +
            "ORDER BY mpf.model_id, mpf.sort ASC" +
            "</script>")
    @Results({
            @Result(column = "model_id", property = "modelId"),
            @Result(column = "storage_path", property = "storagePath"),
            @Result(column = "sort", property = "sort")
    })
    List<ModelFileMapping> selectPreviews(@Param("modelIds") List<Long> modelIds);

    class ModelFileMapping {
        private Long modelId;
        private String storagePath;
        private Integer sort;

        public Long getModelId() { return modelId; }
        public void setModelId(Long modelId) { this.modelId = modelId; }
        public String getStoragePath() { return storagePath; }
        public void setStoragePath(String storagePath) { this.storagePath = storagePath; }
        public Integer getSort() { return sort; }
        public void setSort(Integer sort) { this.sort = sort; }
    }
}
