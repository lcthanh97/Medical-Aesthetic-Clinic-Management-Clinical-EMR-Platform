
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci

COPY . .

# Prisma config yêu cầu biến DIRECT_URL.
# URL này chỉ dùng trong giai đoạn build.
# Không phải kết nối Neon thật.
ENV DIRECT_URL="postgresql://build:build@localhost:5432/build"
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN npx prisma generate

RUN npm run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
