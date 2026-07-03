-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255),
    username VARCHAR(255),
    password_hash VARCHAR(255),
    avatar VARCHAR(255),
    bio VARCHAR(255),
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 模型表
CREATE TABLE IF NOT EXISTS models (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    category VARCHAR(255),
    tags VARCHAR(255)[],
    file_url VARCHAR(255),
    thumbnail_url VARCHAR(255),
    preview_urls VARCHAR(255)[],
    shader_graph_json TEXT,
    author_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    like_count INTEGER DEFAULT 0,
    collect_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 评论表
CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    model_id BIGINT REFERENCES models(id) ON DELETE CASCADE,
    parent_id BIGINT,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reply_to_user_id BIGINT
);

-- 4. 点赞表
CREATE TABLE IF NOT EXISTS model_like (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    model_id BIGINT REFERENCES models(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_model_like UNIQUE (user_id, model_id)
);

-- 5. 收藏表
CREATE TABLE IF NOT EXISTS model_collect (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    model_id BIGINT REFERENCES models(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_model_collect UNIQUE (user_id, model_id)
);

-- 6. 粉丝关注表
CREATE TABLE IF NOT EXISTS followers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    follower_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_follower UNIQUE (user_id, follower_id)
);

-- 7. 私信表
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    receiver_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);

-- 8. 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50),
    from_id BIGINT,
    model_id BIGINT,
    comment_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);

-- 9. 验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255),
    code VARCHAR(10),
    expires_at TIMESTAMP,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 1. 新增：文件总信息表（秒传MD5、格式转换、缩略图关联）
-- 作用：存储文件的核心元信息，与原始models表通过关联表绑定
CREATE TABLE IF NOT EXISTS file_info (
    id BIGSERIAL PRIMARY KEY,
    file_md5 VARCHAR(32) NOT NULL UNIQUE, -- 秒传唯一标识
    original_name VARCHAR(255) NOT NULL, -- 用户上传原始文件名
    file_size BIGINT NOT NULL, -- 文件字节大小（字节）
    file_suffix VARCHAR(30) NOT NULL, -- 文件后缀 glb/fbx/obj/png 等
    storage_path VARCHAR(512) NOT NULL, -- 本地磁盘存储路径
    convert_status SMALLINT NOT NULL DEFAULT 0,
    -- 0=未处理 1=转换中 2=转换成功 3=转换失败
    glb_convert_path VARCHAR(512), -- 转换后轻量化GLB文件路径
    thumbnail_path VARCHAR(512), -- 模型自动生成缩略图本地路径
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 索引：加速MD5查询（秒传核心）
CREATE INDEX idx_file_info_md5 ON file_info(file_md5);

-- 2. 新增：分片上传临时记录表（断点续传核心）
CREATE TABLE IF NOT EXISTS file_chunk (
    id BIGSERIAL PRIMARY KEY,
    file_md5 VARCHAR(32) NOT NULL,
    chunk_index INT NOT NULL, -- 当前分片序号（从0开始）
    chunk_size BIGINT NOT NULL, -- 当前分片字节大小
    chunk_temp_path VARCHAR(512) NOT NULL, -- 分片临时存储地址
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- 唯一约束：防止同一文件的同分片重复上传
    UNIQUE(file_md5, chunk_index)
);
-- 索引：加速分片查询
CREATE INDEX idx_file_chunk_md5 ON file_chunk(file_md5);


-- 3. 新增：模型-主文件关联表（核心兼容层）
-- 作用：绑定models表和file_info表，不修改原始models表
-- 对应原始models的file_url（主文件）
CREATE TABLE IF NOT EXISTS model_main_file (
    id BIGSERIAL PRIMARY KEY,
    model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    file_info_id BIGINT NOT NULL REFERENCES file_info(id) ON DELETE CASCADE,
    -- 唯一约束：一个模型仅绑定一个主文件
    UNIQUE(model_id),
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 索引：加速模型关联文件查询
CREATE INDEX idx_model_main_file_model ON model_main_file(model_id);
CREATE INDEX idx_model_main_file_file ON model_main_file(file_info_id);


-- 4. 新增：模型-缩略图关联表
-- 作用：绑定models表和file_info表，对应原始models的thumbnail_url
CREATE TABLE IF NOT EXISTS model_thumbnail_file (
    id BIGSERIAL PRIMARY KEY,
    model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    file_info_id BIGINT NOT NULL REFERENCES file_info(id) ON DELETE CASCADE,
    -- 唯一约束：一个模型仅绑定一个缩略图（和原始逻辑一致）
    UNIQUE(model_id),
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_model_thumbnail_model ON model_thumbnail_file(model_id);
CREATE INDEX idx_model_thumbnail_file ON model_thumbnail_file(file_info_id);

-- 5. 新增：模型-预览图关联表
-- 作用：绑定models表和file_info表，对应原始models的preview_urls（数组）
-- 支持多预览图，和原始preview_urls逻辑对齐
CREATE TABLE IF NOT EXISTS model_preview_file (
    id BIGSERIAL PRIMARY KEY,
    model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    file_info_id BIGINT NOT NULL REFERENCES file_info(id) ON DELETE CASCADE,
    sort INT DEFAULT 0, -- 预览图排序（对应数组顺序）
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_model_preview_model ON model_preview_file(model_id);
CREATE INDEX idx_model_preview_file ON model_preview_file(file_info_id);