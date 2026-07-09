from sqlalchemy import delete, func, select
from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import ModelAiDocument


class ModelAiDocumentRepository:
    """向量知识库的数据库访问封装。"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def replace_model_documents(self, model_id: int, documents: list[dict]) -> int:
        await self.delete_model_documents(model_id)

        rows = [
            ModelAiDocument(
                model_id=model_id,
                chunk_index=item["chunk_index"],
                chunk_text=item["chunk_text"],
                embedding=item["embedding"],
                doc_metadata=item["metadata"],
            )
            for item in documents
        ]
        self.session.add_all(rows)
        await self.session.commit()
        return len(rows)

    async def delete_model_documents(self, model_id: int) -> int:
        result = await self.session.execute(
            delete(ModelAiDocument).where(ModelAiDocument.model_id == model_id)
        )
        await self.session.commit()
        return result.rowcount or 0

    async def count_documents(self) -> int:
        result = await self.session.execute(select(func.count(ModelAiDocument.id)))
        return int(result.scalar_one() or 0)

    async def search_similar(
        self,
        query_embedding: list[float],
        top_k: int,
        category: str | None = None,
        tags: list[str] | None = None,
    ) -> list[tuple[ModelAiDocument, float]]:
        distance = ModelAiDocument.embedding.cosine_distance(query_embedding).label("distance")
        statement = select(ModelAiDocument, distance)

        if category:
            statement = statement.where(ModelAiDocument.doc_metadata["category"].astext == category)

        if tags:
            for tag in tags:
                statement = statement.where(ModelAiDocument.doc_metadata["tags"].contains([tag]))

        statement = statement.order_by(distance).limit(top_k)
        result = await self.session.execute(statement)
        return [(row[0], float(row[1])) for row in result.all()]

    async def search_terms(
        self,
        terms: list[str],
        top_k: int,
        category: str | None = None,
        tags: list[str] | None = None,
    ) -> list[ModelAiDocument]:
        """基于 LLM 解析出的短词做精确召回。"""

        cleaned_terms = list(dict.fromkeys([term.strip() for term in terms if term.strip()]))
        if not cleaned_terms:
            return []

        conditions = []
        for term in cleaned_terms:
            pattern = f"%{term}%"
            conditions.extend(
                [
                    ModelAiDocument.chunk_text.ilike(pattern),
                    ModelAiDocument.doc_metadata["title"].astext.ilike(pattern),
                    ModelAiDocument.doc_metadata["category"].astext.ilike(pattern),
                    ModelAiDocument.doc_metadata["tags"].astext.ilike(pattern),
                    ModelAiDocument.doc_metadata["generated_tags"].astext.ilike(pattern),
                    ModelAiDocument.doc_metadata["description"].astext.ilike(pattern),
                    ModelAiDocument.doc_metadata["search_text"].astext.ilike(pattern),
                ]
            )

        statement = select(ModelAiDocument).where(or_(*conditions))

        if category:
            statement = statement.where(ModelAiDocument.doc_metadata["category"].astext == category)

        if tags:
            for tag in tags:
                statement = statement.where(ModelAiDocument.doc_metadata["tags"].contains([tag]))

        statement = statement.order_by(ModelAiDocument.updated_at.desc()).limit(top_k)
        result = await self.session.execute(statement)
        return list(result.scalars().all())
