# syntax=docker/dockerfile:1

# =============================================================================
# 1) 构建阶段：安装依赖 → 前端 vite build → 服务端 esbuild 打包为单文件
# =============================================================================
FROM node:24-alpine AS build
WORKDIR /app

# 先只拷依赖清单，命中缓存后 npm ci 不必重复执行
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# =============================================================================
# 2) 运行阶段：只保留构建产物
#    服务端已打包为 dist/server.js（仅 node:* 为外部依赖），无需 node_modules
# =============================================================================
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8787 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data

COPY --from=build /app/dist ./dist

# 数据库与上传文件都落在 DATA_DIR，需可写
RUN mkdir -p /app/data/uploads && chown -R node:node /app/data

USER node
EXPOSE 8787
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
