# admin-dashboard (Vite React SPA) — build แล้ว serve ด้วย nginx
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.d/99-api-base.sh
RUN chmod +x /docker-entrypoint.d/99-api-base.sh
EXPOSE 80
