# 3D 模型分享网站

基于 Vue3 + Three.js + Spring Boot 的现代 3D 模型分享平台

## 技术栈

### 前端

- Vue 3 + Vite (框架 + 构建)
- Three.js (3D 渲染)
- Tailwind CSS (样式)
- Pinia (状态管理)
- Axios (HTTP 请求)

### 后端

- Spring Boot

## 项目结构

```text
3d-model-website/
├── frontend/ # Vue 前端项目
│ ├── node_modules/
│ ├── public/ # 静态资源（如 logo）
│ ├── src/
│ │ ├── assets/ # 图片、字体等
│ │ ├── components/ # 可复用组件
│ │ │ ├── BasePagination.vue # 分页
│ │ │ ├── CommentSection.vue # 评论区
│ │ │ ├── ImageCarousel.vue # 图片轮播
│ │ │ ├── ModelViewer.vue # 3D 模型渲染（Three.js）
│ │ │ ├── ModelCard.vue # 模型卡片
│ │ │ ├── UserCard.vue # 用户卡片
│ │ │ ├── SearchBar.vue # 搜索栏
│ │ │ └── UploadForm.vue # 上传表单
│ │ ├── views/ # 页面视图
│ │ │ ├── HomePage.vue # 首页（推荐+轮播）
│ │ │ ├── SearchResult.vue # 搜索结果
│ │ │ ├── ModelDetail.vue # 模型详情
│ │ │ ├── UserProfile.vue # 用户主页
│ │ │ ├── UploadPage.vue # 上传页
│ │ │ ├── Login.vue # 登录
│ │ │ └── Register.vue # 注册
│ │ ├── stores/ # Pinia 状态管理
│ │ │ ├── auth.js # 用户认证
│ │ │ └── models.js # 模型数据
│ │ ├── router/ # 路由配置
│ │ │ └── index.js
│ │ ├── api/ # Axios API 封装
│ │ │ └── index.js # 统一导出
│ │ ├── utils/ # 工具函数
│ │ │ └── threejs.js # Three.js 辅助
│ │ ├── App.vue
│ │ └── main.js
│ ├── eslint.config.js # ESLint 代码检查配置
│ ├── jsconfig.json # VSCode 路径别名（如 @/components）
│ ├── package.json # 前端依赖和启动脚本
│ ├── package-lock.json # (锁定依赖版本)
│ ├── postcss.config.js # Tailwind CSS 编译配置
│ ├── tailwind.config.js # Tailwind 主题配置
│ ├── vite.config.js # Vite 构建配置
│ └── index.html
│
├── backend/ # Spring Boot 后端项目
│ └── src/
│
├── docs/ # 项目文档
│ ├── API.md # API 规范
│ └── GUIDE.md # 开发指南
│
├── .editorconfig
├── .gitignore
├── .gitattributes
├── .prettierrc.json # 全项目代码格式化
└── README.md
```
