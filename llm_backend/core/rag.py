from collections import OrderedDict

import logging

from core.config import Settings
from core.embeddings import EmbeddingClient
from core.llm import LlmClient
from core.text import build_fallback_description_text, split_text
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

        chunks = split_text(
            description.search_text or description.description,
            self.settings.chunk_size,
            self.settings.chunk_overlap,
        )
        if not chunks:
            fallback = build_fallback_description_text(model.model_dump())
            chunks = split_text(fallback, self.settings.chunk_size, self.settings.chunk_overlap)

        embeddings = await self.embedding_client.embed_texts(chunks)
        if len(embeddings) != len(chunks):
            raise RuntimeError(
                f"Embedding 返回数量异常：期望 {len(chunks)} 个，实际 {len(embeddings)} 个。"
            )

        metadata = self._build_metadata(model_id, model, description, description_source)
        documents = [
            {
                "chunk_index": index,
                "chunk_text": chunk,
                "embedding": embeddings[index],
                "metadata": metadata,
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

        references = self._dedupe_references(rows)
        if not references:
            return ChatResponse(
                answer="本站知识库中暂未找到与该问题匹配的模型资源。",
                references=[],
            )

        context = self._build_context(rows)
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
        return {
            "model_id": model_id,
            "title": model.title,
            "category": description.category or model.category,
            "tags": model.tags,
            "author_id": model.author_id,
            "author_name": model.author_name,
            "thumbnail_url": model.thumbnail_url,
            "file_url": model.file_url,
            "preview_urls": model.preview_urls,
            "visibility": model.visibility,
            "summary": description.summary,
            "style": description.style,
            "use_cases": description.use_cases,
            "keywords": description.keywords,
            "source": "model_upload",
            "description_source": description_source,
            "raw_model": model_data,
        }

    def _build_fallback_description(self, model: ModelMetadata) -> GeneratedDescription:
        fallback_text = build_fallback_description_text(model.model_dump())
        keywords = list(dict.fromkeys([model.category or "", *model.tags, model.title]))
        keywords = [item for item in keywords if item]
        summary = model.description or f"{model.title} 是本站用户上传的 3D 模型资源。"

        return GeneratedDescription(
            summary=summary[:160],
            description=fallback_text,
            category=model.category,
            style=None,
            use_cases=[],
            keywords=keywords[:12],
            search_text=fallback_text,
        )

    def _dedupe_references(self, rows) -> list[ModelReference]:
        refs_by_model_id: OrderedDict[int, ModelReference] = OrderedDict()

        for document, distance in rows:
            metadata = document.doc_metadata or {}
            model_id = int(metadata.get("model_id") or document.model_id)
            score = max(0.0, min(1.0, 1.0 - float(distance)))
            if model_id in refs_by_model_id:
                if score > refs_by_model_id[model_id].score:
                    refs_by_model_id[model_id].score = score
                continue

            refs_by_model_id[model_id] = ModelReference(
                model_id=model_id,
                title=metadata.get("title"),
                thumbnail_url=metadata.get("thumbnail_url"),
                score=round(score, 4),
                reason=metadata.get("summary"),
                metadata=metadata,
            )

        return list(refs_by_model_id.values())

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
