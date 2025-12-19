package com.example.threedmodel.event;

import lombok.Data;

/**
 * 作者发布模型事件
 */
@Data
public class ModelPublishEvent {

    private Long authorId;
    private Long modelId;
}
