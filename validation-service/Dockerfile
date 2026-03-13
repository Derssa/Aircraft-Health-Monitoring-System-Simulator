FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspaces
COPY package*.json ./
COPY shared/package.json shared/
COPY validation-service/package.json validation-service/

RUN npm install

# Copy source
COPY shared/ shared/
COPY validation-service/ validation-service/
COPY tsconfig.base.json ./

# Build dependencies
RUN npm run build --workspace=shared
RUN npm run build --workspace=validation-service

WORKDIR /app/validation-service
CMD ["npm", "start"]
