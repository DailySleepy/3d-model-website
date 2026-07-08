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
