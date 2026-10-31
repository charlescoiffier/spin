FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY server ./server
COPY src ./src
RUN npm run build:server
ENV NODE_ENV=production
ENV PORT=2567
EXPOSE 2567
USER node
CMD ["node", "--import", "tsx", "server/index.ts"]
