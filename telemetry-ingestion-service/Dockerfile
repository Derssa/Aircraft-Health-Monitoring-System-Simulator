FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspaces
COPY package*.json ./
COPY shared/package.json shared/
COPY telemetry-ingestion-service/package.json telemetry-ingestion-service/

RUN npm install

# Copy source
COPY shared/ shared/
COPY telemetry-ingestion-service/ telemetry-ingestion-service/
COPY tsconfig.base.json ./

# Build dependencies
RUN npm run build --workspace=shared
RUN npm run build --workspace=telemetry-ingestion-service

WORKDIR /app/telemetry-ingestion-service
CMD ["npm", "start"]
