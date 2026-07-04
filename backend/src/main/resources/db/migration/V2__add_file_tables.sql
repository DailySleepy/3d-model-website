-- =============================================
-- V2: 新增文件管理相关表（分片上传、秒传、异步转换）
-- =============================================

-- 1. 文件总信息表（秒传MD5、格式转换、缩略图关联）
CREATE TABLE IF NOT EXISTS file_info (
                                         id BIGSERIAL PRIMARY KEY,
                                         file_md5 VARCHAR(32) NOT NULL UNIQUE,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_suffix VARCHAR(30) NOT NULL,
    storage_path VARCHAR(512) NOT NULL,
    convert_status SMALLINT NOT NULL DEFAULT 0,
    glb_convert_path VARCHAR(512),
    thumbnail_path VARCHAR(512),
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX idx_file_info_md5 ON file_info(file_md5);

-- 2. 分片上传临时记录表（断点续传）
CREATE TABLE IF NOT EXISTS file_chunk (
                                          id BIGSERIAL PRIMARY KEY,
                                          file_md5 VARCHAR(32) NOT NULL,
    chunk_index INT NOT NULL,
    chunk_size BIGINT NOT NULL,
    chunk_temp_path VARCHAR(512) NOT NULL,
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_md5, chunk_index)
    );

CREATE INDEX idx_file_chunk_md5 ON file_chunk(file_md5);

-- 3. 模型-主文件关联表
CREATE TABLE IF NOT EXISTS model_main_file (
                                               id BIGSERIAL PRIMARY KEY,
                                               model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    file_info_id BIGINT NOT NULL REFERENCES file_info(id) ON DELETE CASCADE,
    UNIQUE(model_id),
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX idx_model_main_file_model ON model_main_file(model_id);
CREATE INDEX idx_model_main_file_file ON model_main_file(file_info_id);

-- 4. 模型-缩略图关联表
CREATE TABLE IF NOT EXISTS model_thumbnail_file (
                                                    id BIGSERIAL PRIMARY KEY,
                                                    model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    file_info_id BIGINT NOT NULL REFERENCES file_info(id) ON DELETE CASCADE,
    UNIQUE(model_id),
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX idx_model_thumbnail_model ON model_thumbnail_file(model_id);
CREATE INDEX idx_model_thumbnail_file ON model_thumbnail_file(file_info_id);

-- 5. 模型-预览图关联表
CREATE TABLE IF NOT EXISTS model_preview_file (
                                                  id BIGSERIAL PRIMARY KEY,
                                                  model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    file_info_id BIGINT NOT NULL REFERENCES file_info(id) ON DELETE CASCADE,
    sort INT DEFAULT 0,
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE INDEX idx_model_preview_model ON model_preview_file(model_id);
CREATE INDEX idx_model_preview_file ON model_preview_file(file_info_id);