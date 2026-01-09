package com.example.threedmodel.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.example.threedmodel.entity.Follower;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface FollowerMapper extends BaseMapper<Follower> {
    // 检查是否已关注
    int selectCountByUserAndFollower(@Param("userId") Long userId, @Param("followerId") Long followerId);
}