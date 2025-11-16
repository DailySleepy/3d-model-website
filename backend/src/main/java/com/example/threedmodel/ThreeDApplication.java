package com.example.threedmodel;

import org.springframework.boot.SpringApplication;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.example.threedmodel.mapper") // 扫描Mapper接口所在包
public class ThreeDApplication {

    public static void main(String[] args) {
        SpringApplication.run(ThreeDApplication.class, args);
    }

}
