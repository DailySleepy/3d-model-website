package com.example.threedmodel.event;

import lombok.Data;

/**
 * 点赞 / 收藏事件
 */
@Data
public class ModelActionEvent {

    private Long operatorId;   // 谁操作的
    private Long targetUserId; // 模型作者
    private Long modelId;
    private String type;       // like / collect
}
