package com.example.threedmodel.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CommentCreateDTO {
    @NotNull(message = "模型ID不能为空")
    private Long modelId; // 评论所属模型ID

    private Long parentId; // 父评论ID（回复时传递）

    @NotBlank(message = "评论内容不能为空")
    private String content; // 评论内容
}