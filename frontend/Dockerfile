# Frontend: Vite dev server on port 8080
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci 2>/dev/null || npm install

COPY . .

EXPOSE 8080
# Host 0.0.0.0 so the dev server is reachable from the host
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]
