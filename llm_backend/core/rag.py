from collections import OrderedDict

import logging

from core.config import Settings
from core.embeddings import EmbeddingClient
from core.llm import LlmClient
from core.text import build_fallback_description_text, build_structured_index_chunks
from db.repositories import ModelAiDocumentRepository
from schemas.ai import (
    ChatFilters,
    ChatResponse,
    GeneratedDescription,
    ModelMetadata,
    ModelReference,
)


logger = logging.getLogger(__name__)


class RagService:
    """RAG 核心流程编排。"""

    def __init__(self, settings: Settings, repository: ModelAiDocumentRepository):
        self.settings = settings
        self.repository = repository
        self.embedding_client = EmbeddingClient(settings)
        self.llm_client = LlmClient(settings)

    async def generate_description(self, model: ModelMetadata) -> GeneratedDescription:
        return await self.llm_client.generate_model_description(model)

    async def index_model(
        self,
        model_id: int,
        model: ModelMetadata,
        description: GeneratedDescription | None = None,
        force_generate_description: bool = False,
    ) -> int:
        description_source = "ai_generated"
        if description is None or force_generate_description:
            try:
                description = await self.generate_description(model)
            except Exception as exc:
                # 描述生成失败时仍然允许使用原始模型信息建索引，避免发布流程因对话模型波动完全失去向量数据。
                logger.warning("模型 %s 的 AI 描述生成失败，改用原始信息生成索引文本：%s", model_id, exc)
                description = self._build_fallback_description(model)
                description_source = "fallback_metadata"

        chunks = build_structured_index_chunks(
            model.model_dump(),
            description.model_dump(),
            self.settings.chunk_size,
            self.settings.chunk_overlap,
        )

        chunk_texts = [chunk["text"] for chunk in chunks]
        embeddings = await self.embedding_client.embed_texts(chunk_texts)
        if len(embeddings) != len(chunks):
            raise RuntimeError(
                f"Embedding 返回数量异常：期望 {len(chunks)} 个，实际 {len(embeddings)} 个。"
            )

        metadata = self._build_metadata(model_id, model, description, description_source)
        documents = [
            {
                "chunk_index": index,
                "chunk_text": chunk["text"],
                "embedding": embeddings[index],
                "metadata": {
                    **metadata,
                    "chunk_type": chunk["chunk_type"],
                    "has_cover_image": bool(model.thumbnail_url),
                },
            }
            for index, chunk in enumerate(chunks)
        ]

        return await self.repository.replace_model_documents(model_id, documents)

    async def answer_question(
        self,
        question: str,
        filters: ChatFilters | None,
        top_k: int | None,
    ) -> ChatResponse:
        if not self._is_model_resource_question(question):
            return ChatResponse(
                answer="我目前只负责基于本站 3D 模型资源进行检索和推荐。这个问题不属于模型资源查找范围，因此不会返回模型引用。",
                references=[],
            )

        document_count = await self.repository.count_documents()
        if document_count == 0:
            return ChatResponse(
                answer="AI 知识库暂无模型数据。请先发布模型并完成向量索引后再提问。",
                references=[],
            )

        query_embedding = await self.embedding_client.embed_text(question)
        rows = await self.repository.search_similar(
            query_embedding=query_embedding,
            top_k=top_k or self.settings.rag_top_k,
            category=filters.category if filters else None,
            tags=filters.tags if filters else None,
        )
        matched_rows = self._filter_rows_by_score(rows)

        references = self._dedupe_references(matched_rows)
        if not references:
            return ChatResponse(
                answer="这个问题没有匹配到足够相关的站内模型资源，因此我不能返回模型推荐。你可以换成模型类型、风格、用途或场景相关的问题再试。",
                references=[],
            )

        context = self._build_context(matched_rows)
        answer = await self.llm_client.answer_with_context(question, context, references)
        return ChatResponse(answer=answer, references=references)

    def _build_metadata(
        self,
        model_id: int,
        model: ModelMetadata,
        description: GeneratedDescription,
        description_source: str,
    ) -> dict:
        model_data = model.model_dump()
        generated_tags = description.tags.model_dump()
        flat_generated_tags = self._flatten_generated_tags(generated_tags)
        category = model.category or self._first_item(generated_tags.get("category"))
        return {
            "model_id": model_id,
            "title": model.title,
            "category": category,
            "tags": list(dict.fromkeys([*model.tags, *flat_generated_tags])),
            "generated_tags": generated_tags,
            "author_id": model.author_id,
            "author_name": model.author_name,
            "thumbnail_url": model.thumbnail_url,
            "file_url": model.file_url,
            "preview_urls": model.preview_urls,
            "visibility": model.visibility,
            "description": description.description,
            "search_text": description.search_text,
            "source": "model_upload",
            "description_source": description_source,
            "raw_model": model_data,
        }

    def _build_fallback_description(self, model: ModelMetadata) -> GeneratedDescription:
        fallback_text = build_fallback_description_text(model.model_dump())
        return GeneratedDescription(
            description=fallback_text,
            tags={
                "subject": [model.title] if model.title else [],
                "category": [model.category] if model.category else [],
                "style": [],
                "features": model.tags,
                "color": [],
                "material": [],
                "use_cases": [],
            },
            search_text=fallback_text,
        )

    def _dedupe_references(self, rows) -> list[ModelReference]:
        refs_by_model_id: OrderedDict[int, ModelReference] = OrderedDict()

        for document, distance in rows:
            metadata = document.doc_metadata or {}
            model_id = int(metadata.get("model_id") or document.model_id)
            score = self._distance_to_score(distance)
            if model_id in refs_by_model_id:
                if score > refs_by_model_id[model_id].score:
                    refs_by_model_id[model_id].score = score
                continue

            refs_by_model_id[model_id] = ModelReference(
                model_id=model_id,
                title=metadata.get("title"),
                thumbnail_url=metadata.get("thumbnail_url"),
                score=round(score, 4),
                reason=metadata.get("description"),
                metadata=metadata,
            )

        return list(refs_by_model_id.values())

    def _filter_rows_by_score(self, rows) -> list:
        matched_rows = []
        for document, distance in rows:
            score = self._distance_to_score(distance)
            if score >= self.settings.rag_min_score:
                matched_rows.append((document, distance))
        return matched_rows

    def _distance_to_score(self, distance: float) -> float:
        return max(0.0, min(1.0, 1.0 - float(distance)))

    def _flatten_generated_tags(self, generated_tags: dict) -> list[str]:
        values: list[str] = []
        for tag_group in generated_tags.values():
            if isinstance(tag_group, list):
                values.extend(str(item).strip() for item in tag_group if str(item).strip())
        return values

    def _first_item(self, values) -> str | None:
        if not values:
            return None
        for value in values:
            text = str(value).strip()
            if text:
                return text
        return None

    def _is_model_resource_question(self, question: str) -> bool:
        normalized = question.lower().strip()
        if not normalized:
            return False

        resource_keywords = (
            "模型",
            "3d",
            "三维",
            "资源",
            "素材",
            "贴图",
            "低模",
            "高模",
            "场景",
            "角色",
            "道具",
            "建筑",
            "动物",
            "水果",
            "游戏",
            "渲染",
            "推荐",
            "找",
            "有没有",
            "适合",
        )
        blocked_keywords = (
            "数学题",
            "数学问题",
            "解方程",
            "证明",
            "计算",
            "代码报错",
            "写作文",
            "翻译",
        )

        if any(keyword in normalized for keyword in blocked_keywords):
            return False
        return any(keyword in normalized for keyword in resource_keywords)

    def _build_context(self, rows) -> str:
        parts: list[str] = []
        total_length = 0

        for document, distance in rows:
            metadata = document.doc_metadata or {}
            block = (
                f"模型ID：{metadata.get('model_id') or document.model_id}\n"
                f"标题：{metadata.get('title') or '未知'}\n"
                f"分类：{metadata.get('category') or '未分类'}\n"
                f"标签：{'、'.join(metadata.get('tags') or [])}\n"
                f"相似度距离：{distance:.4f}\n"
                f"资料：{document.chunk_text}\n"
            )
            if total_length + len(block) > self.settings.rag_max_context_chars:
                break
            parts.append(block)
            total_length += len(block)

        return "\n---\n".join(parts)
