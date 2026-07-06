# Для деплоя на VPS / Railway / Fly. Данные (SQLite + загрузки) лежат в /app/data —
# смонтируйте туда volume, чтобы они переживали перезапуски.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV DOCKER_BUILD=1
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# шрифты для рендера обложек (referenced by path, not traced by Next)
COPY --from=build /app/node_modules/dejavu-fonts-ttf/ttf ./node_modules/dejavu-fonts-ttf/ttf
RUN mkdir -p /app/data
VOLUME /app/data
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
