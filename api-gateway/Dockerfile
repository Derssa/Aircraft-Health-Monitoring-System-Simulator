FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspaces
COPY package*.json ./
COPY shared/package.json shared/
COPY api-gateway/package.json api-gateway/

RUN npm install

# Copy source
COPY shared/ shared/
COPY api-gateway/ api-gateway/
COPY tsconfig.base.json ./

# Build dependencies
RUN npm run build --workspace=shared
RUN npm run build --workspace=api-gateway

WORKDIR /app/api-gateway
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
