package com.example.threedmodel.service;

import com.example.threedmodel.model.entity.VerificationCode;

public interface VerificationCodeService {

    void createCode(String email, String code);

    VerificationCode validateCode(String email, String code);
}