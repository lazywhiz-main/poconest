FROM node:18-alpine

# 必要なパッケージをインストール (Alpine Linux用)
RUN apk add --no-cache ffmpeg

WORKDIR /app

# package.jsonをコピー
COPY package.json ./

# 完全にクリーンインストール（キャッシュ無効化）
RUN npm cache clean --force && rm -rf node_modules package-lock.json && npm install --production --no-cache

# アプリケーションコードとpackage.jsonをコピー
COPY index.js ./
COPY package.json ./package.json

# ポートを公開
EXPOSE 8080

# アプリケーションを起動
CMD ["node", "index.js"]
