package com.example.threedmodel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.threedmodel.entity.FileInfo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Param;
import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface FileInfoMapper extends BaseMapper<FileInfo> {

    @Select("SELECT * FROM file_info f " +
            "WHERE f.create_at < #{thresholdTime} " +
            "  AND NOT EXISTS (SELECT 1 FROM model_main_file WHERE file_info_id = f.id) " +
            "  AND NOT EXISTS (SELECT 1 FROM model_thumbnail_file WHERE file_info_id = f.id) " +
            "  AND NOT EXISTS (SELECT 1 FROM model_preview_file WHERE file_info_id = f.id) " +
            "  AND NOT EXISTS (SELECT 1 FROM model_shader_texture WHERE file_info_id = f.id)")
    List<FileInfo> selectUnreferencedFiles(@Param("thresholdTime") LocalDateTime thresholdTime);
}