-- 1. 创建新表 model_shader_graph
CREATE TABLE IF NOT EXISTS model_shader_graph (
    id BIGSERIAL PRIMARY KEY,
    model_id BIGINT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    shader_graph_json TEXT NOT NULL,
    update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_id)
);
CREATE INDEX idx_model_shader_graph_model ON model_shader_graph(model_id);

-- 2. 迁移已有的 models 关联主文件数据到 file_info 及 model_main_file
INSERT INTO file_info (file_md5, original_name, file_size, file_suffix, storage_path, convert_status)
SELECT DISTINCT
    md5(file_url) as file_md5,
    COALESCE(substring(file_url from '[^/]+$'), 'model.glb') as original_name,
    0 as file_size,
    COALESCE(substring(file_url from '\.([^.]+)$'), 'glb') as file_suffix,
    file_url as storage_path,
    2 as convert_status
FROM models 
WHERE file_url IS NOT NULL AND file_url != ''
ON CONFLICT (file_md5) DO NOTHING;

INSERT INTO model_main_file (model_id, file_info_id)
SELECT m.id, f.id
FROM models m
JOIN file_info f ON f.storage_path = m.file_url
WHERE m.file_url IS NOT NULL AND m.file_url != ''
ON CONFLICT (model_id) DO NOTHING;

-- 3. 迁移已有的 models 关联缩略图数据到 file_info 及 model_thumbnail_file
INSERT INTO file_info (file_md5, original_name, file_size, file_suffix, storage_path, convert_status)
SELECT DISTINCT
    md5(thumbnail_url) as file_md5,
    COALESCE(substring(thumbnail_url from '[^/]+$'), 'thumbnail.png') as original_name,
    0 as file_size,
    COALESCE(substring(thumbnail_url from '\.([^.]+)$'), 'png') as file_suffix,
    thumbnail_url as storage_path,
    2 as convert_status
FROM models 
WHERE thumbnail_url IS NOT NULL AND thumbnail_url != ''
ON CONFLICT (file_md5) DO NOTHING;

INSERT INTO model_thumbnail_file (model_id, file_info_id)
SELECT m.id, f.id
FROM models m
JOIN file_info f ON f.storage_path = m.thumbnail_url
WHERE m.thumbnail_url IS NOT NULL AND m.thumbnail_url != ''
ON CONFLICT (model_id) DO NOTHING;

-- 4. 迁移已有的 models 关联预览图数据到 file_info 及 model_preview_file
INSERT INTO file_info (file_md5, original_name, file_size, file_suffix, storage_path, convert_status)
SELECT DISTINCT
    md5(preview_url) as file_md5,
    COALESCE(substring(preview_url from '[^/]+$'), 'preview.png') as original_name,
    0 as file_size,
    COALESCE(substring(preview_url from '\.([^.]+)$'), 'png') as file_suffix,
    preview_url as storage_path,
    2 as convert_status
FROM (
    SELECT unnest(preview_urls) as preview_url 
    FROM models 
    WHERE preview_urls IS NOT NULL
) sub
ON CONFLICT (file_md5) DO NOTHING;

WITH unnested_previews AS (
    SELECT 
        m.id as model_id, 
        u.preview_url, 
        u.ord - 1 as sort_idx
    FROM models m,
    LATERAL unnest(m.preview_urls) WITH ORDINALITY AS u(preview_url, ord)
    WHERE m.preview_urls IS NOT NULL
)
INSERT INTO model_preview_file (model_id, file_info_id, sort)
SELECT up.model_id, f.id, up.sort_idx
FROM unnested_previews up
JOIN file_info f ON f.storage_path = up.preview_url;

-- 5. 迁移已有的 models.shader_graph_json 数据到 model_shader_graph 表
INSERT INTO model_shader_graph (model_id, shader_graph_json)
SELECT id, shader_graph_json
FROM models
WHERE shader_graph_json IS NOT NULL AND shader_graph_json != '';

-- 6. 删除 models 表中旧有的直接字段
ALTER TABLE models DROP COLUMN IF EXISTS file_url;
ALTER TABLE models DROP COLUMN IF EXISTS thumbnail_url;
ALTER TABLE models DROP COLUMN IF EXISTS preview_urls;
ALTER TABLE models DROP COLUMN IF EXISTS shader_graph_json;
