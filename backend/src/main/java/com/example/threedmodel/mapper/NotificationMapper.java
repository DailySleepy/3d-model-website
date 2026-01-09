package com.example.threedmodel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.threedmodel.entity.Notification;
import org.apache.ibatis.annotations.Mapper;

/**
 * Notification Mapper
 * 被 NotificationService 调用
 */
@Mapper
public interface NotificationMapper extends BaseMapper<Notification> {
}
