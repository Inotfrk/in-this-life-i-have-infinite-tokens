# 用户中心后端。用 Node 20 跑，够用且镜像小。
FROM docker.m.daocloud.io/library/node:20-alpine

WORKDIR /app

# 先只拷依赖清单，改代码时不会重复装包。
COPY package.json ./
# 容器内访问官方 npm 源会 TLS 握手失败，改用国内镜像。
RUN npm install --omit=dev --no-audit --no-fund --registry=https://registry.npmmirror.com

COPY src ./src
COPY test ./test

# 容器内不用 root 跑应用。
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/index.js"]
