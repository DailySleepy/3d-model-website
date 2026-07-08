import httpx

from core.config import Settings


class EmbeddingClient:
    """Embedding 模型调用封装，当前适配 OpenRouter 的 /embeddings 接口。"""

    def __init__(self, settings: Settings):
        if not settings.embedding_api_key:
            raise RuntimeError("未配置 EMBEDDING_API_KEY，无法调用 Embedding 模型。")

        self.settings = settings
        self.endpoint = f"{settings.embedding_base_url.rstrip('/')}/embeddings"
        self.headers = {
            "Authorization": f"Bearer {settings.embedding_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.openrouter_site_url,
            "X-OpenRouter-Title": settings.openrouter_app_title,
        }

    async def embed_text(self, text: str) -> list[float]:
        vectors = await self.embed_texts([text])
        if not vectors:
            raise RuntimeError("Embedding 服务未返回向量数据。")
        return vectors[0]

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        normalized_texts = [text.strip() for text in texts if text and text.strip()]
        if not normalized_texts:
            return []

        payload = {
            "model": self.settings.embedding_model,
            "input": normalized_texts,
        }

        try:
            async with httpx.AsyncClient(timeout=60, trust_env=False) as client:
                response = await client.post(self.endpoint, headers=self.headers, json=payload)
        except httpx.HTTPError as exc:
            raise RuntimeError(f"Embedding 服务网络请求失败：{type(exc).__name__} {exc}") from exc

        if response.status_code >= 400:
            raise RuntimeError(
                f"Embedding 服务请求失败，状态码 {response.status_code}：{_truncate(response.text)}"
            )

        try:
            data = response.json()
        except ValueError as exc:
            raise RuntimeError(f"Embedding 服务返回了非 JSON 响应：{_truncate(response.text)}") from exc

        vectors = self._extract_embeddings(data)
        if not vectors:
            raise RuntimeError(f"Embedding 服务未返回向量数据，原始响应：{_truncate(str(data))}")

        return vectors

    def _extract_embeddings(self, payload: dict) -> list[list[float]]:
        items = payload.get("data")
        if isinstance(items, list):
            vectors = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                embedding = item.get("embedding")
                if isinstance(embedding, list) and embedding:
                    vectors.append([float(value) for value in embedding])
            return vectors

        embedding = payload.get("embedding")
        if isinstance(embedding, list) and embedding:
            return [[float(value) for value in embedding]]

        embeddings = payload.get("embeddings")
        if isinstance(embeddings, list) and embeddings:
            if all(isinstance(value, (int, float)) for value in embeddings):
                return [[float(value) for value in embeddings]]
            vectors = []
            for embedding_item in embeddings:
                if isinstance(embedding_item, list) and embedding_item:
                    vectors.append([float(value) for value in embedding_item])
            return vectors

        return []


def _truncate(text: str, limit: int = 1200) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + "..."
