import json


def build_fallback_description_text(model_dump: dict) -> str:
    """没有调用大模型时，用已有元数据构造可检索文本。"""

    parts: list[str] = []
    for key in ("title", "category", "description", "author_name"):
        value = model_dump.get(key)
        if value:
            parts.append(str(value))

    tags = model_dump.get("tags") or []
    if tags:
        parts.append("标签：" + "、".join(tags))

    structure_info = model_dump.get("structure_info")
    if structure_info:
        parts.append("结构信息：" + str(structure_info))

    return "\n".join(parts).strip()


def build_structured_index_chunks(
    model_dump: dict,
    description_dump: dict,
    chunk_size: int,
    chunk_overlap: int,
) -> list[dict]:
    """根据模型元数据和 AI 描述构造稳定的结构化索引 chunk。

    上传模型固定带封面图时，AI 识图结果会进入 description 字段。这里按用户常见检索意图
    拆成多个短 chunk：主体分类、视觉外观、风格材质、用途场景、综合检索文本。每个 chunk
    都保留模型名称，但避免把所有标签堆到同一段里，降低无关标签互相干扰。
    """

    chunks: list[dict] = []

    title = _get_value(model_dump, "title")
    generated_tags = _get_value(description_dump, "tags") or {}
    subject_tags = _clean_list(_get_value(generated_tags, "subject"))
    category_tags = _clean_list(_get_value(generated_tags, "category"))
    style_tags = _clean_list(_get_value(generated_tags, "style"))
    feature_tags = _clean_list(_get_value(generated_tags, "features"))
    color_tags = _clean_list(_get_value(generated_tags, "color"))
    material_tags = _clean_list(_get_value(generated_tags, "material"))
    use_case_tags = _clean_list(_get_value(generated_tags, "use_cases"))
    category = _get_value(model_dump, "category") or _first_non_empty(category_tags)
    category_labels = _unique_list(([category] if category else []) + category_tags)
    raw_tags = _clean_list(_get_value(model_dump, "tags"))
    merged_tags = _unique_list(
        raw_tags
        + subject_tags
        + category_tags
        + style_tags
        + feature_tags
        + color_tags
        + material_tags
        + use_case_tags
    )
    description = _get_value(description_dump, "description")
    search_text = _get_value(description_dump, "search_text")
    user_description = _get_value(model_dump, "description")
    author_name = _get_value(model_dump, "author_name")
    structure_info = _get_value(model_dump, "structure_info")
    shader_graph_json = _get_value(model_dump, "shader_graph_json")

    chunks.extend(
        _split_named_chunk(
            "identity",
            _format_paragraph(
                [
                    _sentence("模型名称", title),
                    _sentence("主体对象", subject_tags),
                    _sentence("资源分类", category_labels),
                    _sentence("用户原始标签", raw_tags),
                    _sentence("作者", author_name),
                    _sentence("用户简介", user_description),
                ]
            ),
            chunk_size,
            chunk_overlap,
        )
    )

    chunks.extend(
        _split_named_chunk(
            "visual_description",
            _format_paragraph(
                [
                    _sentence("模型名称", title),
                    f"封面图显示：{description}" if description else "",
                    _natural_sentence("可见主体包括", subject_tags),
                    _natural_sentence("关键视觉特征包括", feature_tags),
                    _natural_sentence("主要颜色包括", color_tags),
                ]
            ),
            chunk_size,
            chunk_overlap,
        )
    )

    chunks.extend(
        _split_named_chunk(
            "style_material",
            _format_paragraph(
                [
                    _sentence("模型名称", title),
                    _natural_sentence("艺术或制作风格包括", style_tags),
                    _natural_sentence("可见材质包括", material_tags),
                    _natural_sentence("资源类别包括", category_labels),
                    _natural_sentence("相关标签包括", _unique_list(style_tags + material_tags + category_labels)),
                ]
            ),
            chunk_size,
            chunk_overlap,
        )
    )

    chunks.extend(
        _split_named_chunk(
            "usage",
            _format_paragraph(
                [
                    _sentence("模型名称", title),
                    _natural_sentence("适用场景包括", use_case_tags),
                    _natural_sentence("适合查找这类资源的关键词包括", _unique_list(subject_tags + use_case_tags + raw_tags)),
                ]
            ),
            chunk_size,
            chunk_overlap,
        )
    )

    chunks.extend(
        _split_named_chunk(
            "semantic_search",
            _format_paragraph(
                [
                    _sentence("模型名称", title),
                    search_text,
                    _natural_sentence("综合标签包括", _unique_list(category_labels + merged_tags)),
                ]
            ),
            chunk_size,
            chunk_overlap,
        )
    )

    has_technical_info = bool(structure_info or shader_graph_json)
    technical_text = ""
    if has_technical_info:
        technical_text = _format_lines(
            [
                ("模型名称", title),
                ("结构信息", _json_dumps(structure_info)),
                ("材质或节点信息", shader_graph_json),
            ]
        )
        chunks.extend(_split_named_chunk("technical_info", technical_text, chunk_size, chunk_overlap))

    if not chunks:
        fallback = build_fallback_description_text(model_dump)
        chunks.extend(_split_named_chunk("fallback_metadata", fallback, chunk_size, chunk_overlap))

    return chunks


def split_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    """按字符长度切分文本，保留少量重叠以减少语义断裂。"""

    cleaned = text.strip()
    if not cleaned:
        return []

    if chunk_size <= 0:
        return [cleaned]

    overlap = max(0, min(chunk_overlap, chunk_size // 2))
    chunks: list[str] = []
    start = 0

    while start < len(cleaned):
        end = min(start + chunk_size, len(cleaned))
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(cleaned):
            break
        start = end - overlap

    return chunks


def _get_value(data: dict, key: str):
    value = data.get(key)
    if value is not None:
        return value

    alias_map = {
        "author_name": "authorName",
        "file_url": "fileUrl",
        "thumbnail_url": "thumbnailUrl",
        "preview_urls": "previewUrls",
        "shader_graph_json": "shaderGraphJson",
        "structure_info": "structureInfo",
    }
    alias = alias_map.get(key)
    return data.get(alias) if alias else None


def _clean_list(value) -> list[str]:
    if not value:
        return []
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    return [str(item).strip() for item in value if str(item).strip()]


def _unique_list(values: list[str]) -> list[str]:
    return list(dict.fromkeys([item for item in values if item]))


def _first_non_empty(values: list[str]) -> str | None:
    for value in values:
        if value:
            return value
    return None


def _format_lines(items: list[tuple[str, object]]) -> str:
    lines: list[str] = []
    for label, value in items:
        if value is None or value == "":
            continue
        if isinstance(value, list):
            if not value:
                continue
            text = "、".join(value)
        else:
            text = str(value).strip()
        if text:
            lines.append(f"{label}：{text}")
    return "\n".join(lines).strip()


def _format_paragraph(sentences: list[str | None]) -> str:
    cleaned = [sentence.strip() for sentence in sentences if sentence and sentence.strip()]
    return "\n".join(cleaned)


def _sentence(label: str, value) -> str:
    if value is None or value == "":
        return ""
    if isinstance(value, list):
        if not value:
            return ""
        text = "、".join(value)
    else:
        text = str(value).strip()
    return f"{label}：{text}。" if text else ""


def _natural_sentence(prefix: str, values: list[str]) -> str:
    if not values:
        return ""
    return f"{prefix}{'、'.join(values)}。"


def _split_named_chunk(
    chunk_type: str,
    text: str,
    chunk_size: int,
    chunk_overlap: int,
) -> list[dict]:
    parts = split_text(text, chunk_size, chunk_overlap)
    return [{"chunk_type": chunk_type, "text": part} for part in parts]


def _json_dumps(value) -> str | None:
    if not value:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False)
