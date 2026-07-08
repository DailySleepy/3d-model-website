package com.example.threedmodel;

import org.springframework.boot.SpringApplication;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling // 开启定时任务功能
@SpringBootApplication
@MapperScan("com.example.threedmodel.mapper") // 扫描Mapper接口所在包
public class ThreeDApplication {

    public static void main(String[] args) {
        SpringApplication.run(ThreeDApplication.class, args);
    }

}
