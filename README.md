# 3D 模型分享网站

基于 Vue3 + Three.js + Spring Boot 的现代 3D 模型分享平台

## 技术栈

### 前端

- Vue 3 + Vite
- Three.js (3D 渲染)
- Tailwind CSS (样式)
- Pinia (状态管理)
- Axios (HTTP 请求)

### 后端

- Spring Boot
- PostgreSQL
- JWT 认证

## 项目结构

3d-model-website/
├── **frontend/** _# Vue 前端项目_
│ ├── **node_modules/**
│ ├── **public/** _# 静态资源（如 logo）_
│ ├── **src/**
│ │ ├── **assets/** _# 图片、字体等_
│ │ ├── **components/** _# 可复用组件_
│ │ │ ├── ModelViewer.vue _# 3D 模型渲染（Three.js）_
│ │ │ ├── ModelCard.vue _# 模型卡片_
│ │ │ ├── UploadForm.vue _# 上传表单_
│ │ │ ├── SearchBar.vue _# 搜索栏_
│ │ │ ├── Pagination.vue _# 分页_
│ │ │ └── CommentSection.vue _# 评论区_
│ │ ├── **views/** _# 页面视图_
│ │ │ ├── HomePage.vue _# 首页（推荐+轮播）_
│ │ │ ├── SearchResult.vue _# 搜索结果_
│ │ │ ├── ModelDetail.vue _# 模型详情_
│ │ │ ├── UserProfile.vue _# 用户主页_
│ │ │ ├── UploadPage.vue _# 上传页_
│ │ │ ├── Login.vue _# 登录_
│ │ │ └── Register.vue _# 注册_
│ │ ├── **stores/** _# Pinia 状态管理_
│ │ │ ├── auth.js _# 用户认证_
│ │ │ └── models.js _# 模型数据_
│ │ ├── **router/** _# 路由配置_
│ │ │ └── index.js
│ │ ├── **api/** _# Axios API 封装_
│ │ │ └── index.js _# 统一导出_
│ │ ├── **utils/** _# 工具函数_
│ │ │ └── threejs.js _# Three.js 辅助_
│ │ ├── App.vue
│ │ └── main.js
│ ├── eslint.config.js _# ESLint 代码检查配置_
│ ├── jsconfig.json _# VSCode 路径别名（如 @/components）_
│ ├── package.json _# 前端依赖和启动脚本_
│ ├── package-lock.json _(锁定依赖版本)_
│ ├── postcss.config.js _# Tailwind CSS 编译配置_
│ ├── tailwind.config.js _# Tailwind 主题配置_
│ ├── vite.config.js _# Vite 构建配置_
│ └── index.html
│
├── **backend/** _# Spring Boot 后端项目_
│ └── **src/**
│
├── **docs/** _# 项目文档_
│ ├── API.md _# API 规范_
│ └── GUIDE.md _# 开发指南_
│
├── .editorconfig
├── .gitignore
├── .gitattributes
├── .prettierrc.json _# 全项目代码格式化_
└── README.md
