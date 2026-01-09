package com.example.threedmodel.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.example.threedmodel.mapper.VerificationCodeMapper;
import com.example.threedmodel.model.entity.VerificationCode;
import com.example.threedmodel.service.VerificationCodeService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class VerificationCodeServiceImpl implements VerificationCodeService {

    private final VerificationCodeMapper mapper;

    public VerificationCodeServiceImpl(VerificationCodeMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public void createCode(String email, String code) {
        VerificationCode vc = new VerificationCode();
        vc.setId(UUID.randomUUID().toString());
        vc.setEmail(email);
        vc.setCode(code);
        vc.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        vc.setIsUsed(false);

        mapper.insert(vc);
    }

    @Override
    public VerificationCode validateCode(String email, String code) {

        // 查询有效验证码
        VerificationCode vc = mapper.selectOne(
                new QueryWrapper<VerificationCode>()
                        .eq("email", email)
                        .eq("code", code)
                        .eq("is_used", false)
                        .gt("expires_at", LocalDateTime.now())
                        .last("LIMIT 1")
        );

        if (vc != null) {
            // 标记为已使用
            mapper.update(null,
                    new UpdateWrapper<VerificationCode>()
                            .eq("id", vc.getId())
                            .set("is_used", true)
            );
        }

        return vc;
    }
}