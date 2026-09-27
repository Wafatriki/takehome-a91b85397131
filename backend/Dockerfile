# Node 22 ejecuta TypeScript directamente: sin build.
#
# El contexto de build es la RAÍZ del starter, no `backend/`: el front es un módulo aparte y este
# servidor es quien lo sirve, así que la imagen necesita los dos.
#
#   docker build -f backend/Dockerfile .
FROM node:22-alpine
WORKDIR /app
COPY backend/package.json ./backend/
COPY backend/src ./backend/src
COPY frontend ./frontend
WORKDIR /app/backend
USER node
CMD ["npm", "start"]
