# 功能模块分解与 API 设计

## 首页 / 浏览与搜索

| 模块 | 用户故事 | 前端任务 | 后端任务 | 数据库设计 | 说明 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **首页展示** | 游客打开网站可浏览推荐模型与作者 | `HomePage.vue`，轮播图与推荐区块 | `GET /api/models/recommend` 返回推荐模型与作者 | `models`, `users` | 推荐策略初期可随机或按点赞数排序 |
| **搜索** | 用户通过关键词搜索模型或作者 | `SearchBar.vue` 跳转至 `SearchResult.vue`；URL Query 同步 | `GET /api/search?q=&type=(model 或 author)&sort=(hot 或 time)&page=` | `models`, `users` | 模糊匹配 title / description；分页返回 |
| **排序过滤** | 用户可按时间或热门程度排序 | `SearchResult.vue` 排序菜单 | 同上接口，通过 `sort` 参数控制 | - | 默认热门排序（按点赞+收藏权重） |

---

## 用户认证与主页

| 模块 | 用户故事 | 前端任务 | 后端任务 | 数据库设计 | 说明 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **注册** | 用户填写邮箱、用户名、密码注册 | `Register.vue` 表单 | `POST /api/auth/register` | `users(email, username, passwordHash, avatar, bio, createdAt)` | 密码加盐存储，用户名唯一 |
| **登录** | 用户通过邮箱/用户名登录 | `Login.vue` 表单 | `POST /api/auth/login` 返回 JWT | `users` | Token 存储于 LocalStorage |
| **用户主页** | 查看自己或他人主页作品与资料 | `UserPage.vue` | `GET /api/users/:id` 获取资料；`GET /api/models?authorId=` 获取作品 | `users`, `models` | 展示头像、简介、作品、粉丝数等 |
| **关注系统** | 登录用户可关注他人 | `FollowButton.vue` | `POST /api/users/:id/follow` / `DELETE` 取消 | `followers(userId, followerId)` | 主页显示粉丝数、关注数 |

---

## 模型上传与管理

| 模块 | 用户故事 | 前端任务 | 后端任务 | 数据库设计 | 说明 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **上传流程** | 登录用户上传模型 | `Upload.vue` 上传表单 + 进度条 | `POST /api/upload` (Multer) | `models(title, desc, category, tags, fileUrl, thumbnailUrl, previewUrls, authorId, createdAt)` | 支持 `.glb` (含纹理) |
| **封面上传** | 上传封面图 | 同上或独立接口 | `POST /api/upload/thumbnail` | `models.thumbnailUrl` | 前端压缩后上传 |
| **预览图上传** | 上传预览图 | 同上或独立接口 | `POST /api/upload/previews` | `models.previewUrls` | 前端压缩后上传 |
| **模型解析** | 上传后本地解析、可预览 | 使用 `Three.js` 在浏览器解析 | 无需后端参与 | - | 解析成功后点击提交发布 |
| **发布模型** | 上传完成后正式提交 | 点击“发布”按钮提交所有元数据和 URL | `POST /api/models` 接收 Title, Description, Category, Tags, FileUrl, ThumbnailUrl, PreviewUrls 等所有元数据 | `models` | 写入数据库，模型才正式可见 |

---

## 模型浏览与互动

| 模块 | 用户故事 | 前端任务 | 后端任务 | 数据库设计 | 说明 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **模型详情** | 点击模型进入详情页 | `ModelDetail.vue` + `Three.js` 渲染 | `GET /api/models/:id` | `models` | 初始加载封面图，点击播放再加载模型 |
| **点赞** | 登录用户可点赞 | `LikeButton.vue` | `POST /api/models/:id/like` / `DELETE` | `likes(userId, modelId)` | 点赞计数缓存至 `models.likeCount` |
| **收藏** | 登录用户可收藏模型 | `CollectButton.vue` | `POST /api/models/:id/collect` / `DELETE` | `collections(userId, modelId)` | 同上逻辑 |
| **评论** | 登录用户可评论模型 | `CommentList.vue` + 输入框 | `GET /api/models/:id/comments` / `POST /api/comments` | `comments(userId, modelId, content, createdAt)` | 支持分页与删除 |
| **下载模型** | 登录用户可下载模型文件 | `DownloadButton.vue` | `GET /api/models/:id/download` | `models.fileUrl` | 权限校验后提供文件流下载 |

---

## 通知与消息系统

| 模块 | 用户故事 | 前端任务 | 后端任务 | 数据库设计 | 说明 |
| :-- | :-- | :-- | :-- | :-- | :-- |
| **通知中心** | 用户查看收到的赞、评论、系统消息 | `NotificationDropdown.vue` | `GET /api/notifications` | `notifications(userId, type, fromId, modelId, createdAt, isRead)` | type: `like` / `comment` / `system` |
| **私信** | 用户之间私聊（可选） | `ChatModal.vue` | `GET /api/messages/:userId` / `POST /api/messages` | `messages(fromId, toId, content, createdAt)` | MVP 阶段可延后 |

---

## 高级渲染功能（最后选择性添加）

| 模块 | 前端任务 | 后端任务 | 备注 |
| :-- | :-- | :-- | :-- |

---

## 数据库结构概要

### users
```js
{
  _id,
  username,
  email,
  passwordHash,
  avatarUrl,
  bio,
  followers: [userId],
  following: [userId],
  createdAt
}
```

### models
```js
{
  _id,
  title,
  description,
  category, // 人物/场景/材质
  tags: [String],
  fileUrl,
  thumbnailUrl,
  previewUrls: [String], // 可选的多张预览图的 URL 列表
  authorId,
  likeCount,
  collectCount,
  createdAt
}
```

### comments
```js
{
  _id,
  modelId,
  userId,
  content,
  createdAt
}
```

### notifications
```js
{
  _id,
  userId,
  type, // 点赞/评论/系统消息
  fromId,
  modelId,
  isRead,
  createdAt
}
```