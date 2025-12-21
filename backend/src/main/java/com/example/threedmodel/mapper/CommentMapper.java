package com.example.threedmodel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.threedmodel.dto.CommentDTO;
import com.example.threedmodel.entity.Comment;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface CommentMapper extends BaseMapper<Comment> {

    // 查询模型的一级评论（parentId为null），并关联用户信息
    List<CommentDTO> selectRootCommentsByModelId(
            @Param("modelId") Long modelId,
            @Param("offset") int offset,
            @Param("size") int size
    );

    // 查询评论的子回复（parentId不为null），并关联用户信息
    List<CommentDTO> selectChildCommentsByParentId(@Param("parentId") Long parentId);

    // 查询评论总数（用于分页）
    Long selectTotalCommentsByModelId(@Param("modelId") Long modelId);
}