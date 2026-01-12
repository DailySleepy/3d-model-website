package com.example.threedmodel.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.threedmodel.dto.CommentCreateDTO;
import com.example.threedmodel.dto.CommentDTO;
import com.example.threedmodel.dto.PageResultDTO;
import com.example.threedmodel.dto.UserCommentDTO;
import com.example.threedmodel.entity.Comment;
import com.example.threedmodel.entity.Model;
import com.example.threedmodel.event.ModelCommentEvent;
import com.example.threedmodel.mapper.CommentMapper;
import com.example.threedmodel.mapper.ModelMapper;
import com.example.threedmodel.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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

        // 2. 保存评论（补充：设置新增的replyToUserId字段）
        Comment comment = new Comment();
        comment.setUserId(currentUserId);
        comment.setModelId(dto.getModelId());
        comment.setParentId(dto.getParentId());
        comment.setReplyToUserId(dto.getReplyToUserId()); // 新增：绑定被回复用户ID（兼容原有逻辑）
        comment.setContent(dto.getContent());
        baseMapper.insert(comment);

        // 3. 根据刚创建的评论ID，精准查询CommentDTO
        CommentDTO result = commentMapper.selectCommentDTOById(comment.getId());
        if (result == null) {
            throw new RuntimeException("评论创建失败（无法查询到刚创建的评论）");
        }

        // 4. 发布评论事件（触发通知
        Long receiverId = dto.getParentId() == null
                ? model.getAuthorId()   // 一级评论：通知模型作者
                                        // 回复：通知被回复的评论作者
                : Optional.ofNullable(dto.getReplyToUserId()) // 回复一级评论的二级评论, 回复对象是null; 回复二级评论的二级评论, 回复对象非null
                    .orElseGet(() -> baseMapper.selectById(dto.getParentId()).getUserId());

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
                new LambdaQueryWrapper<Comment>()
                        .eq(Comment::getParentId, commentId)
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

        // 2. 查询一级评论（parent_id=null）
        List<CommentDTO> rootComments = commentMapper.selectRootCommentsByModelId(modelId, offset, size);

        // 3. 优化：批量查询所有一级评论的子回复（解决N+1问题，实现B站二级扁平结构）
        if (!rootComments.isEmpty()) {
            // 3.1 提取所有一级评论ID
            List<Long> rootCommentIds = rootComments.stream()
                    .map(CommentDTO::getId)
                    .collect(Collectors.toList());

            // 3.2 调用自定义的批量查询方法（替代BaseMapper的selectList）
            List<CommentDTO> allChildComments = commentMapper.selectBatchChildCommentsByParentIds(rootCommentIds);

            // 3.3 子回复按parentId分组（便于快速绑定到对应一级评论）
            Map<Long, List<CommentDTO>> childCommentMap = new HashMap<>();
            for (CommentDTO child : allChildComments) {
                childCommentMap.computeIfAbsent(child.getParentId(), k -> new java.util.ArrayList<>())
                        .add(child);
            }

            // 3.4 为每个一级评论绑定子回复（平铺显示，B站风格，
            rootComments.forEach(comment -> {
                comment.setChildren(childCommentMap.getOrDefault(comment.getId(), java.util.Collections.emptyList()));
            });
        }

        // 4. 查询总条数（用于分页）
        Long total = commentMapper.selectTotalAllCommentsByModelId(modelId); // 新逻辑（所有评论）
        Long totalLevel1 = commentMapper.selectTotalCommentsByModelId(modelId);

        // 5. 计算总页数
        Integer totalPages = (total == 0) ? 1 : (int) Math.ceil((double) total / size);

        // 6. 封装分页结果
        PageResultDTO<CommentDTO> pageResult = new PageResultDTO<>();
        pageResult.setItems(rootComments);
        pageResult.setTotal(total);
        pageResult.setTotalLevel1(totalLevel1);
        pageResult.setPage(page);
        pageResult.setPageSize(size);
        pageResult.setTotalPages(totalPages);

        return pageResult;
    }

    @Override
    public PageResultDTO<UserCommentDTO> getCommentsByUserId(Long userId, int page, int size) {
        Page<Comment> commentPage = commentMapper.selectPage(
                new Page<>(page, size),
                new LambdaQueryWrapper<Comment>()
                        .eq(Comment::getUserId, userId)
                        .orderByDesc(Comment::getCreatedAt)
        );

        List<Comment> comments = commentPage.getRecords();
        if (comments.isEmpty()) {
            return new PageResultDTO<>(List.of(), commentPage.getTotal(), page, size);
        }

        Set<Long> modelIds = comments.stream()
                .map(Comment::getModelId)
                .collect(Collectors.toSet());
        Map<Long, Model> modelMap = modelMapper.selectBatchIds(modelIds).stream()
                .collect(Collectors.toMap(Model::getId, model -> model));

        List<UserCommentDTO> items = comments.stream()
                .map(comment -> {
                    Model model = modelMap.get(comment.getModelId());
                    UserCommentDTO dto = new UserCommentDTO();
                    dto.setId(comment.getId());
                    dto.setModelId(comment.getModelId());
                    dto.setModelTitle(model != null ? model.getTitle() : null);
                    dto.setModelThumbnailUrl(model != null ? model.getThumbnailUrl() : null);
                    dto.setContent(comment.getContent());
                    dto.setCreatedAt(comment.getCreatedAt());
                    return dto;
                })
                .collect(Collectors.toList());

        return new PageResultDTO<>(items, commentPage.getTotal(), page, size);
    }
}
