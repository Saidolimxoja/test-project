FROM node:22-alpine

WORKDIR /app

# Устанавливаем зависимости и билдим клиент
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Устанавливаем зависимости сервера
COPY server/package*.json ./server/
RUN cd server && npm install

COPY server/ ./server/

EXPOSE 3001

CMD ["node", "server/index.js"]