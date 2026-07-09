# 3D Model Sharing Platform

基于 Vue 3, Three.js 和 Spring Boot 的现代化 3D 模型分享与交互社区。

[![Vue 3](https://img.shields.io/badge/Vue-3.x-4fc08d?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r128+-black?style=flat-square&logo=three.js)](https://threejs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-6db33f?style=flat-square&logo=springboot)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-316192?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.x-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?style=flat-square&logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## 项目简介

本项目是一个全栈式的 3D 模型分享与交互平台。前端基于 Vue 3、Vite 与 Three.js 构建，实现了高性能的 3D 模型在线交互渲染；后端基于 Spring Boot 框架，搭配 MyBatis-Plus 与 PostgreSQL 数据库进行数据持久化，提供安全、稳定、响应迅速的 API 服务。

项目已实现完整的功能闭环，支持容器化一键快速部署，适合作为 3D 网页端展示、模型社区或企业级三维资产管理系统的脚手架与参考范本。

---

## 核心特性

- **3D 实时渲染交互**
  - 基于 Three.js 的 GLB 模型动态加载与 OrbitControls 轨道相机控制。
  - 支持平移、旋转、缩放等平滑视口交互。
  - 内置完善的渲染异常捕获与加载提示机制，确保前端浏览的稳定性。

- **全功能互动社区**
  - 支持模型点赞、收藏，快速将感兴趣的模型收录至个人库。
  - 优雅的二级嵌套评论系统（类似 Bilibili 风格），支持回复特定用户，强化社区交流深度。
  - 创作者关注机制，支持关注、取消关注，动态展示作者的粉丝数与获赞数据。

- **私信与消息通知中心**
  - 即时私信系统：支持用户之间发送私信、会话列表聚合展示以及历史记录平滑查询。
  - 动态通知中心：自动生成并聚合点赞、收藏、新评论及关注等互动消息，支持全局一键已读。

- **高安全级别认证体系**
  - 基于 JWT（JSON Web Token）的无状态身份认证机制，Token 自动进行本地化加密存储。
  - 支持基于邮箱验证码的账户注册与密码重置服务，保证用户信息安全。

- **多维度检索与排序**
  - 强大的模糊搜索接口，支持按模型名称、关键词、作者或描述进行全文匹配。
  - 支持按分类筛选以及按发布时间或热门程度（点赞数、收藏数）进行复合排序。

---

## 项目目录结构

```text
3d-model-website/
├── frontend/             # 基于 Vue 3 + Three.js + Tailwind CSS 的前端工程
├── backend/              # 基于 Spring Boot + MyBatis-Plus + PostgreSQL 的后端工程
├── llm_backend/          # 基于 Fastapi + Pyvector的后端工程
├── docker-compose.yml    # 用于一键部署完整生产/演示环境的 Docker 配置文件
└── README.md             # 项目自述文件
```

---

## 用户权限矩阵

| 功能模块 | 游客访问 | 已登录用户 | 业务逻辑说明 |
| :--- | :---: | :---: | :--- |
| 浏览模型与搜索 | 允许 | 允许 | 免登录即可查看 3D 模型和执行全局搜索 |
| 3D 视角交互 | 允许 | 允许 | 支持自由平移、缩放和旋转相机视角 |
| 关注创作者 | 拒绝 | 允许 | 关注作者后可随时在其动态中查看新作品 |
| 点赞与收藏作品 | 拒绝 | 允许 | 点赞和收藏会自动同步给作者并进入个人主页库 |
| 发表评论与回复 | 拒绝 | 允许 | 支持发表一级评论与针对具体用户的二级回复 |
| 私信与查看通知 | 拒绝 | 允许 | 允许发送消息及接收点赞/评论等系统提醒 |
| 上传模型与文件 | 拒绝 | 允许 | 支持上传 `.glb` 模型、封面和多张预览图 |
| 下载模型文件 | 拒绝 | 允许 | 仅允许已登录的合法用户下载原始 `.glb` 文件 |

---

## 部署与开发指南

### 1. 使用 Docker Compose 一键部署（推荐）

项目支持通过 Docker 快速拉起整套运行环境（PostgreSQL 数据库、前端 Nginx、后端 Java 服务）。

```bash
# 克隆并进入项目根目录
cd 3d-model-website

# 复制环境变量模板并自定义配置（默认配置已备妥，可直接一键运行）
cp .env.example .env

# 一键启动所有服务
docker-compose up -d
```

启动完成后，您可以通过以下地址进行访问与调试：
- **前端门户**：`http://localhost:80`
- **后端 API 入口**：`http://localhost:8080`
- **PostgreSQL 数据库**：`127.0.0.1:5432` （用户名与密码读取自根目录 `.env`，默认为 `postgres` / `z3j1m4`）

---

### 2. 本地开发与调试

#### 前置要求
- **Node.js**：18.x 或以上版本
- **JDK**：17 或以上版本
- **Maven**：3.8.x 或以上版本
- **PostgreSQL**：14.x 或以上版本，启用pgvector拓展
- **uv**：管理Python 环境和依赖

#### 后端服务配置与启动

1. 登录本地 PostgreSQL 实例，创建数据库：
   ```sql
   CREATE DATABASE threed_model_db;
   ```
2. 配置环境变量：进入 `backend` 目录，将 `.env.example` 复制并命名为 `.env`，并在其中填入您本地 PostgreSQL 实际的连接信息（密码等）。
3. 运行后端服务（系统将自动通过 `spring-dotenv` 加载您配置的 `backend/.env`）：
   ```bash
   cd backend
   mvn spring-boot:run
   ```

#### 前端工程配置与启动

1. 进入前端工程目录：
   ```bash
   cd frontend
   ```
2. 安装项目依赖：
   ```bash
   npm install
   ```
3. 启动开发服务器（支持热重载）：
   ```bash
   npm run dev
   ```
   运行成功后，浏览器访问 `http://localhost:5173`。前端已配置 Vite 反向代理，请求将自动转发至后端的 `http://localhost:8080`。

#### AI 后端配置与启动

1. 进入 AI 后端目录并同步依赖：
   ```bash
   cd llm_backend
   uv sync
   ```
2. 配置环境变量：将 `.env.example` 复制并命名为 `.env`，并在其中填入您实际的连接信息（密码等）。
3. 启动 FastAPI 服务：
   ```bash
   uv run uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

