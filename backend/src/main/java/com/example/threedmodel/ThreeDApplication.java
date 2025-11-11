package com.example.threedmodel;

import dev.langchain4j.community.store.embedding.redis.spring.RedisEmbeddingStoreAutoConfiguration;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

public class ThreeDApplication {

    public static void main(String[] args) {
        SpringApplication.run(ThreeDApplication.class, args);
    }

}
