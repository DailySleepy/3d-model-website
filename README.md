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
├── frontend/                     # Vue 前端项目
│   ├── node_modules/
│   ├── public/                   # 静态资源（如 logo）
│   ├── src/
│   │   ├── assets/               # 图片、字体等
│   │   ├── components/           # 可复用组件
│   │   │   ├── BasePagination.vue # 分页
│   │   │   ├── CommentSection.vue # 评论区
│   │   │   ├── ImageCarousel.vue # 图片轮播
│   │   │   ├── ModelViewer.vue   # 3D 模型渲染（Three.js）
│   │   │   ├── ModelCard.vue     # 模型卡片
│   │   │   ├── UserCard.vue      # 用户卡片
│   │   │   ├── TopBar.vue        # 顶部导航
│   │   │   └── UploadForm.vue    # 上传表单 <TODO>
│   │   ├── views/                # 页面视图
│   │   │   ├── HomePage.vue      # 首页（推荐+轮播）
│   │   │   ├── SearchResult.vue  # 搜索结果
│   │   │   ├── ModelDetail.vue   # 模型详情
│   │   │   ├── UserPage.vue      # 用户主页
│   │   │   ├── UserSettings.vue  # 用户设置页
│   │   │   ├── UploadPage.vue    # 上传页 <TODO>
│   │   │   ├── LoginPage.vue     # 登录
│   │   │   └── RegisterPage.vue  # 注册
│   │   ├── stores/               # Pinia 状态管理
│   │   │   ├── auth.js           # 用户认证
│   │   │   └── models.js         # 模型数据
│   │   ├── router/               # 路由配置
│   │   │   └── index.js
│   │   ├── api/                  # Axios API 封装
│   │   │   └── index.js          # 统一导出
│   │   ├── utils/                # 工具函数
│   │   │   └── threejs.js        # Three.js 辅助
│   │   ├── App.vue
│   │   └── main.js
│   ├── eslint.config.js          # ESLint 代码检查配置
│   ├── jsconfig.json             # VSCode 路径别名（如 @/components）
│   ├── package.json              # 前端依赖和启动脚本
│   ├── package-lock.json         # (锁定依赖版本)
│   ├── postcss.config.js         # Tailwind CSS 编译配置
│   ├── tailwind.config.js        # Tailwind 主题配置
│   ├── vite.config.js            # Vite 构建配置
│   └── index.html
│
├── backend/                      # Spring Boot 后端项目
│   ├── pom.xml
│   └── src/
│       └── main/
│           ├── java/
│           │   └── com/
│           │       └── example/
│           │           └── threedmodel/
│           │               ├── ThreeDApplication.java
│           │               │
│           │               ├── config/
│           │               │   ├── MyBatisPlusConfig.java  # 分页插件配置
│           │               │   └── WebMvcConfig.java       # 静态资源映射
│           │               │
│           │               ├── controller/
│           │               │   ├── AuthController.java     # 登录/注册/验证码
│           │               │   ├── CommentController.java  # <TODO>
│           │               │   ├── FollowController.java   # 关注/取关
│           │               │   ├── IndexController.java    # 健康检查
│           │               │   ├── ModelActionController.java # 点赞/收藏
│           │               │   ├── ModelController.java    # 模型发布/列表
│           │               │   ├── NotificationController.java # <TODO>
│           │               │   ├── SearchController.java   # 搜索
│           │               │   ├── UploadController.java   # 文件上传
│           │               │   ├── UserController.java     # 用户信息
│           │               │   └── UserSettingsController.java # 用户设置
│           │               │
│           │               ├── dto/
│           │               │   ├── ModelCreateDTO.java
│           │               │   ├── ModelDetailDTO.java
│           │               │   ├── PageResultDTO.java
│           │               │   ├── SearchParamDTO.java
│           │               │   ├── UserSettingsUpdateDTO.java
│           │               │   └── ... (UpdateRequest DTOs)
│           │               │
│           │               ├── entity/
│           │               │   ├── Comment.java            # <TODO>
│           │               │   ├── Follower.java
│           │               │   ├── Model.java
│           │               │   ├── ModelCollect.java
│           │               │   ├── ModelLike.java
│           │               │   ├── Notification.java       # <TODO>
│           │               │   ├── User.java
│           │               │   └── VerificationCode.java
│           │               │
│           │               ├── handler/
│           │               │   └── PgArrayTypeHandler.java # PostgreSQL数组类型处理
│           │               │
│           │               ├── mapper/
│           │               │   ├── CommentMapper.java      # <TODO>
│           │               │   ├── FollowerMapper.java
│           │               │   ├── ModelCollectMapper.java
│           │               │   ├── ModelLikeMapper.java
│           │               │   ├── ModelMapper.java
│           │               │   ├── SearchMapper.java
│           │               │   ├── UserMapper.java
│           │               │   └── VerificationCodeMapper.java
│           │               │
│           │               ├── service/
│           │               │   ├── CommentService.java     # <TODO>
│           │               │   ├── FollowerService.java
│           │               │   ├── ModelCollectService.java
│           │               │   ├── ModelLikeService.java
│           │               │   ├── ModelService.java
│           │               │   ├── NotificationService.java # <TODO>
│           │               │   ├── SearchService.java
│           │               │   ├── UserService.java
│           │               │   ├── UserSettingsService.java
│           │               │   └── VerificationCodeService.java
│           │               │
│           │               ├── service/impl/
│           │               │   ├── FollowerServiceImpl.java
│           │               │   ├── SearchServiceImpl.java
│           │               │   ├── UserServiceImpl.java
│           │               │   ├── UserSettingsServiceImpl.java
│           │               │   └── VerificationCodeServiceImpl.java
│           │               │
│           │               └── utils/
│           │                   ├── EmailUtil.java
│           │                   └── JwtUtil.java
│           │
│           └── resources/
│               └── application.yml
│
├── docs/                         # 项目文档
│   ├── API.md                    # API 规范
│   └── GUIDE.md                  # 开发指南
│
├── .editorconfig
├── .gitignore
├── .gitattributes
├── .prettierrc.json
└── README.md
```
