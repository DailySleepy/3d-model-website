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
