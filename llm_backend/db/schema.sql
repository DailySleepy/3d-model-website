-- RAG 向量知识库初始化脚本。

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS model_ai_documents (
    id BIGSERIAL PRIMARY KEY,
    model_id BIGINT NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(2048) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_model_ai_documents_model_id
    ON model_ai_documents(model_id);

-- pgvector 相似度索引可在数据量增长后再开启。
-- CREATE INDEX IF NOT EXISTS idx_model_ai_documents_embedding
--     ON model_ai_documents USING ivfflat (embedding vector_cosine_ops)
--     WITH (lists = 100);
