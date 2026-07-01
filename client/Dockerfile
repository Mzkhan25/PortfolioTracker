FROM node:22 AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY client/package.json client/

RUN npm install

COPY shared/ shared/
COPY client/ client/
COPY tsconfig.base.json .

RUN npm run build:shared

WORKDIR /app/client
RUN npx expo export --platform web

FROM node:22-alpine

RUN npm install -g serve

COPY --from=builder /app/client/dist /app/dist

CMD ["sh", "-c", "serve -s /app/dist -l ${PORT:-3000}"]
