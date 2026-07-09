from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置，优先从 llm_backend/.env 读取。"""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "3d-model-website-llm-backend"
    app_env: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    cors_allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost"

    main_backend_base_url: str = "http://127.0.0.1:8080"

    # 数据库配置：默认复用 backend/.env 的本地 PostgreSQL 配置。
    # 如果 DATABASE_URL 不为空，则优先使用完整 SQLAlchemy 连接串。
    database_url: str = ""
    db_url: str = "127.0.0.1:5432/threed_model_db"
    db_username: str = "postgres"
    db_password: str = Field(default="123456", repr=False)
    auto_create_tables: bool = True

    # 对话模型配置：当前按 DeepSeek 的 OpenAI 兼容接口读取。
    chat_api_key: str = Field(default="", repr=False)
    chat_base_url: str = "https://api.deepseek.com"
    llm_model: str = "deepseek-v4-pro"

    # 识图模型配置：用于上传模型时结合封面图生成描述，按 OpenAI 兼容接口读取。
    image_api_key: str = Field(default="", repr=False)
    image_base_url: str = "https://ark.cn-beijing.volces.com/api/v3"
    image_model: str = "doubao-seed-2-0-lite-260428"
    vision_image_max_bytes: int = 3 * 1024 * 1024

    # 嵌入模型配置：当前按 OpenRouter 的 OpenAI 兼容接口读取。
    embedding_api_key: str = Field(default="", repr=False)
    embedding_base_url: str = "https://openrouter.ai/api/v1"
    embedding_model: str = "nvidia/llama-nemotron-embed-vl-1b-v2:free"
    embedding_dimension: int = 2048

    # OpenRouter 推荐携带的来源标识；没有也可以正常运行。
    openrouter_site_url: str = "http://localhost:5173"
    openrouter_app_title: str = "3D Model Website"

    rag_top_k: int = 5
    rag_min_score: float = 0.35
    rag_max_context_chars: int = 8000
    chunk_size: int = 900
    chunk_overlap: int = 120

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_allowed_origins.split(",") if item.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        if self.database_url:
            return self.database_url

        username = quote_plus(self.db_username)
        password = quote_plus(self.db_password)
        return f"postgresql+asyncpg://{username}:{password}@{self.db_url}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
