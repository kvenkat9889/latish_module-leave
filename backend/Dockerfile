# Backend Dockerfile
FROM node:18

WORKDIR /app

#COPY ../package*.json ./
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3004
CMD ["node", "server.js"]

