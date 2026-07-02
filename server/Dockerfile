FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

# Create the data directory for SQLite and give the non-root user write access
RUN mkdir -p /data && chown appuser:appgroup /data

USER appuser

EXPOSE 3001

CMD ["node", "index.js"]
