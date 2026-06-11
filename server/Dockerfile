FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

# Data directory for SQLite database (mount as volume to persist data)
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "index.js"]
