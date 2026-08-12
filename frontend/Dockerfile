FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copying the rest of the code. This is a dev Dockerfile so we'll mount the whole frontend directory in docker-compose.
COPY . .

RUN npm run build

CMD ["npm", "start"]
