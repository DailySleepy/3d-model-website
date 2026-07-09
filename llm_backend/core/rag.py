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
    QueryIntent,
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

        requested_top_k = top_k or self.settings.rag_top_k
        query_intent = await self._parse_query_intent_safely(question)
        retrieval_query = self._build_retrieval_query(question, query_intent)
        search_terms = self._build_search_terms(query_intent)
        search_limit = max(requested_top_k * 3, requested_top_k)

        query_embedding = await self.embedding_client.embed_text(retrieval_query)
        vector_rows = await self.repository.search_similar(
            query_embedding=query_embedding,
            top_k=search_limit,
            category=filters.category if filters else None,
            tags=filters.tags if filters else None,
        )
        term_documents = await self.repository.search_terms(
            terms=search_terms,
            top_k=search_limit,
            category=filters.category if filters else None,
            tags=filters.tags if filters else None,
        )
        rows = self._merge_vector_and_term_rows(vector_rows, term_documents, search_terms)
        matched_rows = self._filter_rows_by_score(rows)

        references = self._dedupe_references(matched_rows)[:requested_top_k]
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

    async def _parse_query_intent_safely(self, question: str) -> QueryIntent:
        try:
            return await self.llm_client.parse_query_intent(question)
        except Exception as exc:
            logger.warning("查询意图解析失败，改用原始问题检索：%s", exc)
            return QueryIntent(search_text=question)

    def _build_retrieval_query(self, question: str, intent: QueryIntent) -> str:
        parts = [
            question,
            intent.search_text,
            " ".join(self._build_search_terms(intent)),
        ]
        return "\n".join([part for part in parts if part.strip()])

    def _build_search_terms(self, intent: QueryIntent) -> list[str]:
        terms = [
            *intent.keywords,
            *intent.subject,
            *intent.category,
            *intent.style,
            *intent.features,
            *intent.color,
            *intent.material,
            *intent.use_cases,
            *intent.source_ip,
            *intent.must_match,
            *intent.optional,
        ]
        return list(dict.fromkeys([term.strip() for term in terms if self._is_specific_term(term)]))

    def _is_specific_term(self, term: str) -> bool:
        normalized = term.strip().lower()
        if not normalized:
            return False
        generic_terms = {
            "模型",
            "资源",
            "素材",
            "作品",
            "资产",
            "3d",
            "三维",
            "推荐",
            "找",
            "想要",
            "有没有",
        }
        return normalized not in generic_terms

    def _merge_vector_and_term_rows(self, vector_rows, term_documents, search_terms: list[str]) -> list:
        rows_by_id: OrderedDict[int, tuple] = OrderedDict()

        for document, distance in vector_rows:
            rows_by_id[document.id] = (document, distance)

        for document in term_documents:
            term_score = self._term_match_score(document, search_terms)
            term_distance = 1.0 - term_score
            if document.id in rows_by_id:
                existing_document, existing_distance = rows_by_id[document.id]
                rows_by_id[document.id] = (existing_document, min(existing_distance, term_distance))
            else:
                rows_by_id[document.id] = (document, term_distance)

        return sorted(rows_by_id.values(), key=lambda item: item[1])

    def _term_match_score(self, document, search_terms: list[str]) -> float:
        if not search_terms:
            return 0.0

        metadata = document.doc_metadata or {}
        haystack = " ".join(
            [
                document.chunk_text or "",
                str(metadata.get("title") or ""),
                str(metadata.get("category") or ""),
                " ".join(str(item) for item in metadata.get("tags") or []),
                str(metadata.get("generated_tags") or ""),
                str(metadata.get("description") or ""),
                str(metadata.get("search_text") or ""),
            ]
        ).lower()
        matched_count = sum(1 for term in search_terms if term.lower() in haystack)
        if matched_count == 0:
            return 0.0
        ratio = matched_count / len(search_terms)
        return min(0.9, 0.45 + ratio * 0.45)

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

        direct_resource_keywords = (
            "模型",
            "3d",
            "三维",
            "资源",
            "素材",
            "资产",
            "贴图",
            "低模",
            "高模",
        )
        asset_type_keywords = (
            "场景",
            "角色",
            "道具",
            "建筑",
            "动物",
            "水果",
            "植物",
            "武器",
            "载具",
            "车辆",
            "人物",
            "食物",
            "游戏",
            "渲染",
        )
        search_intent_keywords = (
            "推荐",
            "找",
            "想找",
            "想要",
            "需要",
            "有没有",
            "适合",
        )
        style_keywords = (
            "风格",
            "npr",
            "二次元",
            "写实",
            "卡通",
            "科幻",
            "低多边形",
            "low poly",
            "low-poly",
        )
        asset_result_keywords = (
            "作品",
            "资源",
            "素材",
            "资产",
            "模型",
        )

        if any(keyword in normalized for keyword in direct_resource_keywords):
            return True

        has_search_intent = any(keyword in normalized for keyword in search_intent_keywords)
        has_asset_type = any(keyword in normalized for keyword in asset_type_keywords)
        if has_search_intent and has_asset_type:
            return True

        has_style = any(keyword in normalized for keyword in style_keywords)
        has_asset_result = any(keyword in normalized for keyword in asset_result_keywords)
        if has_search_intent and has_style and has_asset_result:
            return True

        return False

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
