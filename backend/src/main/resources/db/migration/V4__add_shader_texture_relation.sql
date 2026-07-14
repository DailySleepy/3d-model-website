-- 1. 创建新表 model_shader_texture
CREATE TABLE IF NOT EXISTS model_shader_texture (
    id BIGSERIAL PRIMARY KEY,
    model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    file_info_id BIGINT NOT NULL REFERENCES file_info(id) ON DELETE CASCADE,
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_id, file_info_id)
);
CREATE INDEX idx_model_shader_texture_model ON model_shader_texture(model_id);

-- 2. 迁移已有的历史着色器贴图数据到 model_shader_texture 中
INSERT INTO model_shader_texture (model_id, file_info_id)
SELECT msg.model_id, f.id
FROM model_shader_graph msg
CROSS JOIN LATERAL jsonb_to_recordset(
    CASE 
        WHEN msg.shader_graph_json IS NOT NULL 
             AND msg.shader_graph_json != '' 
             AND (msg.shader_graph_json::jsonb->'assets'->'customTextures') IS NOT NULL
        THEN msg.shader_graph_json::jsonb->'assets'->'customTextures'
        ELSE '[]'::jsonb
    END
) AS x(path TEXT)
JOIN file_info f ON substring(f.storage_path from '[^/\\]+$') = substring(x.path from '[^/]+$')
ON CONFLICT DO NOTHING;
