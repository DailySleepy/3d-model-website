package com.example.threedmodel.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.example.threedmodel.dto.CommentCreateDTO;
import com.example.threedmodel.dto.CommentDTO;
import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.entity.Comment;

public interface CommentService extends IService<Comment> {

    // 创建评论/回复
    CommentDTO createComment(CommentCreateDTO dto, Long currentUserId);

    // 删除评论/回复（只能删除自己的）
    void deleteComment(Long commentId, Long currentUserId);

    // 分页查询模型的评论列表（含子回复，优化为B站二级扁平结构）
    PageResultDTO<CommentDTO> getCommentsByModelId(Long modelId, int page, int size);
}