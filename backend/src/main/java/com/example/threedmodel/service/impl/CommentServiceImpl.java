package com.example.threedmodel.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.threedmodel.dto.CommentCreateDTO;
import com.example.threedmodel.dto.CommentDTO;
import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.entity.Comment;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.entity.Notification;
import com.example.threedmodel.event.ModelCommentEvent;
import com.example.threedmodel.mapper.CommentMapper;
import com.example.threedmodel.mapper.ModelMapper;
import com.example.threedmodel.service.CommentService;
import com.example.threedmodel.service.ModelService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentServiceImpl extends ServiceImpl<CommentMapper, Comment> implements CommentService {

    private final CommentMapper commentMapper;
    private final ModelMapper modelMapper;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public CommentDTO createComment(CommentCreateDTO dto, Long currentUserId) {
        // 1. 验证模型是否存在
        Model model = modelMapper.selectById(dto.getModelId());
        if (model == null) {
            throw new RuntimeException("模型不存在");
        }

        // 2. 保存评论
        Comment comment = new Comment();
        comment.setUserId(currentUserId);
        comment.setModelId(dto.getModelId());
        comment.setParentId(dto.getParentId());
        comment.setContent(dto.getContent());
        baseMapper.insert(comment);

        // 3. 构建返回DTO（查询完整信息）
        CommentDTO result = commentMapper.selectRootCommentsByModelId(
                        dto.getModelId(), 0, 1).stream().findFirst()
                .orElseThrow(() -> new RuntimeException("评论创建失败"));

        // 4. 发布评论事件（触发通知）
        Long receiverId = dto.getParentId() == null
                ? model.getAuthorId()  // 一级评论：通知模型作者
                : baseMapper.selectById(dto.getParentId()).getUserId(); // 回复：通知被回复的评论作者

        eventPublisher.publishEvent(new ModelCommentEvent(
                this,
                currentUserId,  // 触发者ID
                receiverId,     // 接收者ID
                dto.getModelId(), // 模型ID
                comment.getId()   // 评论ID
        ));

        return result;
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId, Long currentUserId) {
        // 1. 验证评论是否存在
        Comment comment = baseMapper.selectById(commentId);
        if (comment == null) {
            throw new RuntimeException("评论不存在");
        }

        // 2. 验证权限（只能删除自己的评论）
        if (!comment.getUserId().equals(currentUserId)) {
            throw new RuntimeException("没有权限删除此评论");
        }

        // 3. 级联删除子回复
        List<Comment> childComments = baseMapper.selectList(
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Comment>()
                        .eq(Comment::getParentId, commentId) // 直接使用Lambda表达式，无需手动绑定
        );
        if (!childComments.isEmpty()) {
            baseMapper.deleteBatchIds(childComments.stream()
                    .map(Comment::getId)
                    .collect(Collectors.toList()));
        }

        // 4. 删除当前评论
        baseMapper.deleteById(commentId);
    }

    @Override
    public PageResultDTO<CommentDTO> getCommentsByModelId(Long modelId, int page, int size) {
        // 1. 计算分页参数
        int offset = (page - 1) * size;

        // 2. 查询一级评论
        List<CommentDTO> rootComments = commentMapper.selectRootCommentsByModelId(modelId, offset, size);

        // 3. 为每个一级评论查询子回复
        rootComments.forEach(comment -> {
            List<CommentDTO> children = commentMapper.selectChildCommentsByParentId(comment.getId());
            comment.setChildren(children);
        });

        // 4. 查询总条数（用于分页）
        Long total = commentMapper.selectTotalCommentsByModelId(modelId);

        // 5. 计算总页数（补充：PageResultDTO 包含 totalPages 字段，建议赋值）
        Integer totalPages = (total == 0) ? 1 : (int) Math.ceil((double) total / size);

        // 6. 修正核心：使用 PageResultDTO 实际字段对应的 setter 方法
        PageResultDTO<CommentDTO> pageResult = new PageResultDTO<>();
        pageResult.setItems(rootComments); // 替换 setData() → setItems()（对应字段 items）
        pageResult.setTotal(total); // 总条数（字段名一致，无需修改）
        pageResult.setPage(page); // 当前页（字段名一致，无需修改）
        pageResult.setPageSize(size); // 替换 setSize() → setPageSize()（对应字段 pageSize）
        pageResult.setTotalPages(totalPages); // 补充赋值总页数（保证数据完整）

        return pageResult;
    }
}