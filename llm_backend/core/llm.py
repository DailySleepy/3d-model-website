import base64
import json
import mimetypes
from pathlib import Path
from urllib.parse import urlparse

import httpx
from openai import AsyncOpenAI, BadRequestError

from core.config import Settings
from core.prompts import (
    ANSWER_SYSTEM_PROMPT,
    DESCRIPTION_SYSTEM_PROMPT,
    QUERY_PARSE_SYSTEM_PROMPT,
    build_answer_user_prompt,
    build_description_prompt,
    build_query_parse_prompt,
)
from schemas.ai import GeneratedDescription, ModelMetadata, ModelReference, QueryIntent


class LlmClient:
    """对话大模型调用封装，当前适配 DeepSeek 的 OpenAI 兼容接口。"""

    def __init__(self, settings: Settings):
        if not settings.chat_api_key:
            raise RuntimeError("未配置 CHAT_API_KEY，无法调用对话模型。")

        self.settings = settings
        self.chat_client = AsyncOpenAI(
            api_key=settings.chat_api_key,
            base_url=settings.chat_base_url,
            http_client=httpx.AsyncClient(trust_env=False),
        )
        self.image_client = None
        if settings.image_api_key:
            self.image_client = AsyncOpenAI(
                api_key=settings.image_api_key,
                base_url=settings.image_base_url,
                http_client=httpx.AsyncClient(trust_env=False),
            )

    async def generate_model_description(self, model: ModelMetadata) -> GeneratedDescription:
        prompt = build_description_prompt(model)
        user_content = await self._build_description_user_content(model, prompt)
        has_image_content = isinstance(user_content, list)
        if has_image_content and self.image_client:
            client = self.image_client
            model_name = self.settings.image_model
        else:
            client = self.chat_client
            model_name = self.settings.llm_model
            user_content = prompt
        try:
            response = await self._create_description_completion(client, model_name, user_content)
        except BadRequestError as exc:
            if isinstance(user_content, list) and _is_unsupported_vision_error(exc):
                # 当前识图模型如果不支持 image_url，则退回纯文本描述，避免后台索引任务中断。
                response = await self._create_description_completion(self.chat_client, self.settings.llm_model, prompt)
            else:
                raise

        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        return GeneratedDescription(**data)

    async def _create_description_completion(self, client: AsyncOpenAI, model_name: str, user_content):
        return await client.chat.completions.create(
            model=model_name,
            messages=[
                {
                    "role": "system",
                    "content": DESCRIPTION_SYSTEM_PROMPT,
                },
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )

    async def _build_description_user_content(self, model: ModelMetadata, prompt: str):
        image_data_url = await self._load_thumbnail_data_url(model.thumbnail_url)
        if not image_data_url:
            return prompt

        return [
            {
                "type": "text",
                "text": prompt,
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": image_data_url,
                },
            },
        ]

    async def _load_thumbnail_data_url(self, thumbnail_url: str | None) -> str | None:
        if not thumbnail_url:
            return None

        image_bytes, mime_type = await self._read_image_bytes(thumbnail_url)
        if not image_bytes:
            return None

        encoded = base64.b64encode(image_bytes).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"

    async def _read_image_bytes(self, image_url: str) -> tuple[bytes | None, str]:
        local_path = self._resolve_local_upload_path(image_url)
        if local_path and local_path.is_file():
            image_bytes = local_path.read_bytes()
            if len(image_bytes) <= self.settings.vision_image_max_bytes:
                return image_bytes, self._guess_mime_type(str(local_path))

        if image_url.startswith(("http://", "https://")):
            async with httpx.AsyncClient(timeout=15, trust_env=False) as client:
                response = await client.get(image_url)
            content_type = response.headers.get("content-type", "").split(";")[0]
            if response.status_code < 400 and len(response.content) <= self.settings.vision_image_max_bytes:
                return response.content, content_type or self._guess_mime_type(image_url)

        return None, "image/png"

    def _resolve_local_upload_path(self, image_url: str) -> Path | None:
        parsed = urlparse(image_url)
        path = parsed.path if parsed.scheme else image_url
        marker = "/uploads/"
        if marker not in path:
            return None

        relative_upload_path = path.split(marker, 1)[1].lstrip("/\\")
        project_root = Path(__file__).resolve().parents[2]
        return project_root / "backend" / "uploads" / relative_upload_path

    def _guess_mime_type(self, value: str) -> str:
        guessed, _ = mimetypes.guess_type(value)
        if guessed in {"image/png", "image/jpeg", "image/webp", "image/gif"}:
            return guessed
        return "image/png"

    async def answer_with_context(
        self,
        question: str,
        context: str,
        references: list[ModelReference],
    ) -> str:
        if not references:
            return "本站暂未找到与该问题匹配的模型资源。"

        response = await self.chat_client.chat.completions.create(
            model=self.settings.llm_model,
            messages=[
                {
                    "role": "system",
                    "content": ANSWER_SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": build_answer_user_prompt(question, context),
                },
            ],
            temperature=0.2,
        )
        return response.choices[0].message.content or "未生成有效回答。"

    async def parse_query_intent(self, question: str) -> QueryIntent:
        """调用对话模型把用户问题解析为结构化检索条件。"""

        response = await self.chat_client.chat.completions.create(
            model=self.settings.llm_model,
            messages=[
                {
                    "role": "system",
                    "content": QUERY_PARSE_SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": build_query_parse_prompt(question),
                },
            ],
            response_format={"type": "json_object"},
            temperature=0,
        )
        content = response.choices[0].message.content or "{}"
        data = json.loads(content)
        return QueryIntent(**data)


def _is_unsupported_vision_error(exc: BadRequestError) -> bool:
    message = str(exc).lower()
    return "image_url" in message and ("expected `text`" in message or "expected text" in message)

