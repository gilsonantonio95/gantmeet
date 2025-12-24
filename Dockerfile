# Etapa 1: Build do Frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: Servidor de Produção
FROM node:18-alpine
WORKDIR /app

# Copia dependências do servidor
COPY --from=builder /app/server/package*.json ./
RUN npm install --production

# Copia o código do servidor e o build do frontend
COPY --from=builder /app/server ./server
COPY --from=builder /app/dist ./dist

# Configurações de Ambiente
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "server/index.js"]
