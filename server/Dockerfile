FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared/package.json shared/
COPY server/package.json server/

RUN npm install

COPY shared/ shared/
COPY server/ server/
COPY tsconfig.base.json .

RUN npm run build:shared
RUN npm run build:server

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/shared/package.json shared/
COPY --from=builder /app/server/package.json server/

RUN npm install --omit=dev

COPY --from=builder /app/shared/dist shared/dist
COPY --from=builder /app/server/dist server/dist
COPY --from=builder /app/server/drizzle server/drizzle

WORKDIR /app/server

EXPOSE 3000

CMD ["node", "dist/index.js"]
