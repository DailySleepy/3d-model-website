import base64
import json
import mimetypes
from pathlib import Path
from urllib.parse import urlparse

import httpx
from openai import AsyncOpenAI, BadRequestError

from core.config import Settings
from schemas.ai import GeneratedDescription, ModelMetadata, ModelReference


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
        prompt = self._build_description_prompt(model)
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
                    "content": (
                        "你是 3D 模型资源平台的内容编辑助手。"
                        "你只能根据输入信息生成描述，不要编造无法判断的事实。"
                        "如果用户提供了封面图，你需要结合图片中可见的外观、颜色、形态和风格生成描述。"
                        "输出必须是合法 JSON。"
                    ),
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
                "text": (
                    f"{prompt}\n\n"
                    "封面图已经随请求提供。请优先识别封面图中真实可见的主体、颜色、材质、形态、风格和用途，"
                    "并把这些视觉信息写入 description、keywords 和 search_text。"
                    "如果图片信息与用户文字冲突，请以图片可见事实为准，但不要推断不可见内容。"
                ),
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
                    "content": (
                        "你是本站 3D 模型平台的 AI 助手。"
                        "你只能使用提供的站内模型资源回答问题。"
                        "如果资料不足，必须说明限制。"
                        "不要编造模型名称、作者、URL、标签或下载资源。"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"用户问题：\n{question}\n\n"
                        f"站内检索资料：\n{context}\n\n"
                        "请用中文回答，优先推荐最相关模型，并简要说明推荐理由。"
                    ),
                },
            ],
            temperature=0.2,
        )
        return response.choices[0].message.content or "未生成有效回答。"

    def _build_description_prompt(self, model: ModelMetadata) -> str:
        return json.dumps(
            {
                "任务": "为 3D 模型生成规范、准确、适合搜索和展示的中文描述。",
                "输出格式": {
                    "summary": "一句话摘要",
                    "description": "完整自然语言描述，必须包含可见外观、颜色、形态、风格和适用场景",
                    "category": "分类，可沿用输入分类；无法判断则返回空字符串，不要返回 ??、未知 等占位文本",
                    "style": "可判断的视觉或制作风格；无法判断则为空",
                    "use_cases": ["可能用途"],
                    "keywords": ["5 到 12 个关键词"],
                    "search_text": "用于检索的完整自然语言文本，不要只堆叠关键词",
                },
                "要求": [
                    "不要编造用户未提供或无法判断的信息",
                    "不要输出 ??、未知、待定 这类占位词；无法判断的字段返回空字符串或空数组",
                    "如果提供了封面图，必须结合图片可见内容描述外观",
                    "保留标题、分类、标签和用户简介中的有效信息",
                    "search_text 必须是自然语言段落，包含名称、分类、外观、风格、用途和关键词",
                    "输出必须是合法 JSON 对象",
                ],
                "模型信息": model.model_dump(by_alias=True),
            },
            ensure_ascii=False,
        )


def _is_unsupported_vision_error(exc: BadRequestError) -> bool:
    message = str(exc).lower()
    return "image_url" in message and ("expected `text`" in message or "expected text" in message)
