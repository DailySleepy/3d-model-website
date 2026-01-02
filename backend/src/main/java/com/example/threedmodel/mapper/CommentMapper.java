package com.example.threedmodel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.threedmodel.dto.CommentDTO;
import com.example.threedmodel.entity.Comment;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface CommentMapper extends BaseMapper<Comment> {

    // ========== 你的原有方法（完全保留，签名+功能不变，确保兼容性） ==========
    /**
     * 查询模型的一级评论（parentId为null），并关联用户信息（分页查询）
     * @param modelId 模型ID
     * @param offset 分页偏移量
     * @param size 每页条数
     * @return 一级评论DTO列表（含发布者信息）
     */
    List<CommentDTO> selectRootCommentsByModelId(
            @Param("modelId") Long modelId,
            @Param("offset") int offset,
            @Param("size") int size
    );

    /**
     * 查询单个父评论的子回复，并关联用户信息
     * @param parentId 父评论ID
     * @return 该父评论的子回复DTO列表
     */
    List<CommentDTO> selectChildCommentsByParentId(@Param("parentId") Long parentId);

    /**
     * 查询模型的一级评论总数（用于分页计算总页数）
     * @param modelId 模型ID
     * @return 一级评论总条数
     */
    Long selectTotalCommentsByModelId(@Param("modelId") Long modelId);

    // ========== 新增方法（适配二级扁平结构，解决N+1问题，不影响原有逻辑） ==========
    /**
     * 批量查询多个父评论的子回复（平铺显示，B站风格），并关联用户+被回复用户信息
     * @param parentIds 父评论ID列表（一级评论ID集合）
     * @return 所有匹配的子回复DTO列表
     */
    List<CommentDTO> selectBatchChildCommentsByParentIds(@Param("parentIds") List<Long> parentIds);

    /**
     * 根据评论ID查询完整信息（含发布者、被回复用户信息）
     * @param commentId 评论ID
     * @return 评论DTO（精准匹配，无错位）
     */
    CommentDTO selectCommentDTOById(@Param("commentId") Long commentId);
    /**
     * 查询模型下所有评论（一级+二级）总数
     */
    Long selectTotalAllCommentsByModelId(@Param("modelId") Long modelId);
}