from sqlalchemy import delete, func, select
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
