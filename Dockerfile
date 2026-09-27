FROM node:22-alpine

WORKDIR /app
COPY backend/package.json ./backend/
COPY backend/src ./backend/src
COPY frontend ./frontend

WORKDIR /app/backend
EXPOSE 3000
USER node
CMD ["npm", "start"]
