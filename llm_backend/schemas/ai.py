from pydantic import BaseModel, ConfigDict, Field


class ModelMetadata(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str
    category: str | None = None
    tags: list[str] = Field(default_factory=list)
    description: str | None = None
    author_id: int | None = Field(default=None, alias="authorId")
    author_name: str | None = Field(default=None, alias="authorName")
    file_url: str | None = Field(default=None, alias="fileUrl")
    thumbnail_url: str | None = Field(default=None, alias="thumbnailUrl")
    preview_urls: list[str] = Field(default_factory=list, alias="previewUrls")
    shader_graph_json: str | None = Field(default=None, alias="shaderGraphJson")
    structure_info: dict | None = Field(default=None, alias="structureInfo")
    visibility: str = "public"


class GeneratedDescriptionTags(BaseModel):
    """AI 根据封面图和模型信息提取的可检索标签。"""

    subject: list[str] = Field(default_factory=list)
    category: list[str] = Field(default_factory=list)
    style: list[str] = Field(default_factory=list)
    features: list[str] = Field(default_factory=list)
    color: list[str] = Field(default_factory=list)
    material: list[str] = Field(default_factory=list)
    use_cases: list[str] = Field(default_factory=list)


class GeneratedDescription(BaseModel):
    description: str
    tags: GeneratedDescriptionTags = Field(default_factory=GeneratedDescriptionTags)
    search_text: str


class QueryIntent(BaseModel):
    """AI 助手问题解析结果，用于把自然语言拆成可检索条件。"""

    keywords: list[str] = Field(default_factory=list)
    subject: list[str] = Field(default_factory=list)
    category: list[str] = Field(default_factory=list)
    style: list[str] = Field(default_factory=list)
    features: list[str] = Field(default_factory=list)
    color: list[str] = Field(default_factory=list)
    material: list[str] = Field(default_factory=list)
    use_cases: list[str] = Field(default_factory=list)
    source_ip: list[str] = Field(default_factory=list)
    must_match: list[str] = Field(default_factory=list)
    optional: list[str] = Field(default_factory=list)
    search_text: str = ""


class ModelIndexRequest(BaseModel):
    model: ModelMetadata | None = None
    ai_description: GeneratedDescription | None = None
    force_generate_description: bool = False


class ModelIndexResponse(BaseModel):
    model_id: int
    accepted: bool
    message: str


class ChatFilters(BaseModel):
    category: str | None = None
    tags: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    user_id: int | None = None
    question: str = Field(min_length=1)
    filters: ChatFilters | None = None
    top_k: int | None = Field(default=None, ge=1, le=20)


class ModelReference(BaseModel):
    model_id: int
    title: str | None = None
    thumbnail_url: str | None = None
    score: float
    reason: str | None = None
    metadata: dict = Field(default_factory=dict)


class ChatResponse(BaseModel):
    answer: str
    references: list[ModelReference] = Field(default_factory=list)
