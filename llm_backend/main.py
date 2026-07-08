from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import get_settings
from db.session import init_db
from routers.ai import router as ai_router


settings = get_settings()

app = FastAPI(
    title="3D 模型平台 LLM 后端",
    description="用于模型描述生成、向量索引和网页 AI 助手问答的 RAG 服务。",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)


@app.on_event("startup")
async def startup() -> None:
    if settings.auto_create_tables:
        try:
            await init_db()
        except Exception as exc:
            print(f"AI 知识库自动建表失败，服务将继续启动：{exc}")


@app.get("/health")
async def health_check():
    return {"status": "ok"}
