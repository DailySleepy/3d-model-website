import logging

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings, get_settings
from core.rag import RagService
from db.repositories import ModelAiDocumentRepository
from db.session import AsyncSessionLocal, get_db_session
from schemas.ai import (
    ChatRequest,
    ChatResponse,
    GeneratedDescription,
    ModelIndexRequest,
    ModelIndexResponse,
    ModelMetadata,
)


router = APIRouter(prefix="/api/ai", tags=["AI 助手"])
logger = logging.getLogger(__name__)


def get_rag_service(
    session: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
) -> RagService:
    return RagService(settings, ModelAiDocumentRepository(session))


@router.post(
    "/models/{model_id}/generate-description",
    response_model=GeneratedDescription,
    summary="生成模型 AI 描述",
)
async def generate_description(
    model_id: int,
    request: ModelIndexRequest,
    service: RagService = Depends(get_rag_service),
    settings: Settings = Depends(get_settings),
) -> GeneratedDescription:
    model = await _resolve_model_metadata(model_id, request.model, settings)
    return await _run_or_502(service.generate_description(model))


@router.post(
    "/models/{model_id}/index",
    response_model=ModelIndexResponse,
    status_code=202,
    summary="后台写入模型向量索引",
)
async def index_model(
    model_id: int,
    request: ModelIndexRequest,
    background_tasks: BackgroundTasks,
    settings: Settings = Depends(get_settings),
) -> ModelIndexResponse:
    background_tasks.add_task(_index_model_background, model_id, request, settings)
    return ModelIndexResponse(
        model_id=model_id,
        accepted=True,
        message="AI 向量索引任务已提交，将在后台自动执行。",
    )


@router.post("/chat", response_model=ChatResponse, summary="网页 AI 助手问答")
async def chat(
    request: ChatRequest,
    service: RagService = Depends(get_rag_service),
) -> ChatResponse:
    return await _run_or_502(
        service.answer_question(
            question=request.question,
            filters=request.filters,
            top_k=request.top_k,
        )
    )


async def _resolve_model_metadata(
    model_id: int,
    supplied_model: ModelMetadata | None,
    settings: Settings,
) -> ModelMetadata:
    if supplied_model:
        return supplied_model

    url = f"{settings.main_backend_base_url.rstrip('/')}/api/models/{model_id}"
    async with httpx.AsyncClient(timeout=10, trust_env=False) as client:
        response = await client.get(url)

    if response.status_code >= 400:
        raise HTTPException(
            status_code=400,
            detail=f"无法从主后端获取模型元数据，状态码：{response.status_code}",
        )

    data = response.json()
    return ModelMetadata(
        title=data.get("title") or f"模型 {model_id}",
        category=data.get("category"),
        tags=data.get("tags") or [],
        description=data.get("description"),
        author_id=data.get("authorId") or data.get("author_id"),
        file_url=data.get("fileUrl") or data.get("file_url"),
        thumbnail_url=data.get("thumbnailUrl") or data.get("thumbnail_url"),
        preview_urls=data.get("previewUrls") or data.get("preview_urls") or [],
        shader_graph_json=data.get("shaderGraphJson") or data.get("shader_graph_json"),
    )


async def _index_model_background(
    model_id: int,
    request: ModelIndexRequest,
    settings: Settings,
) -> None:
    try:
        async with AsyncSessionLocal() as session:
            service = RagService(settings, ModelAiDocumentRepository(session))
            model = await _resolve_model_metadata(model_id, request.model, settings)
            indexed_count = await service.index_model(
                model_id=model_id,
                model=model,
                description=request.ai_description,
                force_generate_description=request.force_generate_description,
            )
            logger.info("模型 %s 的 AI 向量索引后台任务完成，写入 %s 个 chunk。", model_id, indexed_count)
    except Exception as exc:
        logger.exception("模型 %s 的 AI 向量索引后台任务失败：%s", model_id, exc)


async def _run_or_502(coro):
    try:
        return await coro
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"外部 HTTP 调用失败：{exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI 服务调用失败：{exc}") from exc


