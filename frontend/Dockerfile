# 1. 升级到 Node 20 以符合 Vite 7 的要求
FROM docker.m.daocloud.io/library/node:20-alpine AS build
WORKDIR /app

# 2. 安装依赖
COPY package*.json ./
RUN npm install --registry=https://registry.npmmirror.com

# 3. 复制代码
COPY . .

# 4. 执行打包
# 注意：你的 config.js 里 outDir 是 '../dist'，所以打包后文件在 /dist
RUN npm run build

# 5. 运行阶段
FROM docker.m.daocloud.io/library/nginx:alpine
# 重点：从根目录的 /dist 复制文件
COPY --from=build /dist /usr/share/nginx/html

# 6. 写入 Nginx 配置
RUN echo 'server {     listen 80;     location / {         root /usr/share/nginx/html;         index index.html;         try_files $uri $uri/ /index.html;     }     location /api {         proxy_pass http://backend:8080;         proxy_set_header Host $host;         proxy_set_header X-Real-IP $remote_addr;     }     location /uploads {         proxy_pass http://backend:8080;     } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
