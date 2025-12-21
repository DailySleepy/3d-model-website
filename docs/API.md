# 功能模块分解与 API 设计

## 1. 首页 / 浏览与搜索

| 模块 | 用户故事 | 前端任务 | 后端任务 | 数据库设计 | 说明 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **首页展示** | 游客打开网站可浏览推荐模型与作者 | `HomePage.vue`，包含 `ImageCarousel.vue` 与 `ModelCard.vue` | <!TODO-BE: GET /api/models/recommend 接口待实现，目前仅有健康检查 GET /> | - | 推荐策略初期可随机或按点赞数排序 |
| **搜索** | 用户通过关键词搜索模型或作者 | `TopBar.vue` 跳转至 `SearchResult.vue`；URL Query 同步 | `GET /api/search?q=&type=(model/author)&sort=(hot/time)&page=&pageSize=` | `models`, `users` | 返回包含分页信息的 JSON 对象 |
| **排序过滤** | 用户可按时间或热门程度排序 | `SearchResult.vue` 排序菜单，使用 `BasePagination.vue` | 同上接口，`sort` 参数支持 `hot` 或 `time` | - | 默认热门排序 |

---

## 2. 用户认证与主页

| 模块 | 用户故事 | 前端任务 | 后端任务 | 数据库设计 | 说明 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **发送验证码** | 用户注册或重置密码前获取验证码 | `RegisterPage.vue` / <!TODO-FE: ForgotPassword.vue 缺失，需补全> 增加“发送验证码”按钮 | `POST /api/auth/send-code` (Body: `{email}`) | `verification_codes` | 验证码有效期10分钟 |
| **注册** | 用户填写邮箱、验证码、用户名、密码注册 | `RegisterPage.vue` 表单增加验证码输入框 | `POST /api/auth/register` (Body: `{email, username, password, code}`) | `users`, `verification_codes` | 注册前必须校验验证码 |
| **登录** | 用户通过邮箱/用户名登录 | `LoginPage.vue` 表单 | `POST /api/auth/login` 返回 `{token, username, email, avatar}` | `users` | Token 存入 LocalStorage |
| **找回密码** | 用户忘记密码可通过邮箱重置 | <!TODO-FE: 创建 ForgotPassword.vue> | `POST /api/auth/forgot` (发送码) <br> `POST /api/auth/reset` (重置) | `users`, `verification_codes` | 通过邮箱验证身份 |
| **用户主页** | 查看自己或他人主页作品与资料 | `UserPage.vue`，包含 `UserCard.vue` | `GET /api/users/:id` (获取资料) <br> `GET /api/models?authorId=` (获取作品) | `users`, `models` | 资料包含粉丝数与关注数统计 |
| **关注系统** | 登录用户可关注他人 | <!TODO-FE: 创建 FollowButton.vue 或集成在 UserCard 中> | `POST /api/users/:id/follow` (关注) <br> `DELETE /api/users/:id/follow` (取消) | `followers` | 需 Header 携带 Token |
| **用户设置** | 用户修改个人资料、头像、密码 | `UserSettings.vue` | `PATCH /api/settings/user` (全量更新) <br> `PATCH /api/settings/user/avatar` (仅改头像URL) <br> `POST /api/settings/user/password` (改密码) | `users` | 支持细粒度更新接口 |

---

## 3. 模型上传与管理

| 模块 | 用户故事 | 前端任务 | 后端任务 | 数据库设计 | 说明 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **资源上传** | 用户上传模型文件、封面和预览图 | <!TODO-FE: 创建 UploadPage.vue> | `POST /api/upload/model` (返回 .glb URL) <br> `POST /api/upload/thumbnail` (返回封面 URL) <br> `POST /api/upload/previews` (返回 URL 列表) | - | 文件存至服务器 `/uploads/` 目录 |
| **模型解析** | 上传后本地解析、可预览 | `utils/threejs.js` 在浏览器解析 | 无需后端参与 | - | 前端解析用于生成元数据填入表单 |
| **发布模型** | 上传完成后正式提交 | <!TODO-FE: UploadPage.vue 提交逻辑> | `POST /api/models` (Body: `ModelCreateDTO`) | `models` | 提交包含: title, desc, category, tags[], fileUrl, thumbnailUrl, previewUrls[] |

---

## 4. 模型浏览与互动

| 模块 | 用户故事 | 前端任务 | 后端任务                                                                                                                                                      | 数据库设计 | 说明                                                      |
| :-- | :-- | :-- |:----------------------------------------------------------------------------------------------------------------------------------------------------------| :-- |:--------------------------------------------------------|
| **模型详情** | 点击模型进入详情页 | `ModelDetail.vue` + `ModelViewer.vue` 渲染 (依赖 `utils/threejs.js`) | `GET /api/models/:id`                                                                                                                                     | `models` | 返回详情及 `likedByUser`, `collectedByUser` 状态               |
| **点赞** | 登录用户可点赞 | <!TODO-FE: 创建 LikeButton.vue> | `POST /api/models/:id/like`                                                                                                                               | `model_like` | **Toggle模式**：重复调用即为取消点赞                                 |
| **收藏** | 登录用户可收藏模型 | <!TODO-FE: 创建 CollectButton.vue> | `POST /api/models/:id/collect`                                                                                                                            | `model_collect` | **Toggle模式**：重复调用即为取消收藏                                 |
| **评论** | 登录用户可评论模型 | <!TODO-FE: 创建 CommentSection.vue> | `POST /api/comments：创建评论 / 回复；  DELETE /api/comments/{id}：删除评论 / 回复；  GET /api/comments?modelId={modelId}&page={page}&size={size}：查询模型评论列表### 评论功能后端开发实现` | - | 创建/删除 评论 / 回复；生成评论页面表                                   |
| **下载模型** | 登录用户可下载模型文件 | <!TODO-FE: 创建 DownloadButton.vue> | 直接访问静态资源 `/uploads/models/xxx.glb`                                                                                                                        | - | <!TODO-BE: 带权限校验的下载接口 GET /api/models/:id/download 待开发> |

---

## 5. 通知与消息系统

| 模块 | 用户故事 | 前端任务 | 后端任务 | 数据库设计 | 说明 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **通知中心** | 用户查看收到的赞、评论、系统消息 | <!TODO-FE: 创建 NotificationDropdown.vue> | 'GET api/notifications' + 'POST api/notifications/:id/read' | notifications | 暂未实现 |
| **私信** | 用户之间私聊（可选） | <!TODO-FE: 创建 ChatModal.vue> | <!TODO-BE: 私信模块待开发> | - | 暂未实现 |

---

## 6. 数据库结构概要 (PostgreSQL)

### users
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(255),
  email VARCHAR(255),
  password_hash VARCHAR(255),
  avatar VARCHAR(255),
  bio TEXT,
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### models
```sql
CREATE TABLE models (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  category VARCHAR(255),
  tags VARCHAR[],
  file_url VARCHAR(255),
  thumbnail_url VARCHAR(255),
  preview_urls VARCHAR[],
  author_id BIGINT,
  like_count INT DEFAULT 0,
  collect_count INT DEFAULT 0,
  created_at TIMESTAMP
);
```

### followers
```sql
CREATE TABLE followers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,      -- 被关注者 ID
  follower_id BIGINT   -- 粉丝 ID
);
```

### model_like
```sql
CREATE TABLE model_like (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  model_id BIGINT,
  created_at TIMESTAMP
);
```

### model_collect
```sql
CREATE TABLE model_collect (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  model_id BIGINT,
  created_at TIMESTAMP
);
```

### verification_codes
```sql
CREATE TABLE verification_codes (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255),
  code VARCHAR(10),
  expires_at TIMESTAMP,
  is_used BOOLEAN,
  created_at TIMESTAMP
);
```

### comments <!TODO-BE>
```sql
CREATE TABLE comments (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,        -- 评论发布者
  model_id BIGINT NOT NULL,       -- 评论所属模型
  parent_id BIGINT DEFAULT NULL,  -- 父评论ID (若为NULL则表示是一级评论，不为NULL表示是回复)
  content TEXT NOT NULL,          -- 评论内容
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### notification <!TODO-BE>
```sql
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,        -- 接收通知的用户 ID
  type VARCHAR(20) NOT NULL,      -- 通知类型: 'LIKE', 'COLLECT', 'COMMENT', 'FOLLOW(to do)', 'SYSTEM'
  from_id BIGINT,               -- 触发者 ID (如谁给你点了赞)，系统消息可为 NULL
  model_id BIGINT,                -- 相关联的模型 ID (如点赞/评论了哪个模型)，关注通知可为 NULL
  is_read BOOLEAN DEFAULT FALSE,  -- 是否已读
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
