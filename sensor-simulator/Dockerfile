FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspaces
COPY package*.json ./
COPY shared/package.json shared/
COPY sensor-simulator/package.json sensor-simulator/

RUN npm install

# Copy source
COPY shared/ shared/
COPY sensor-simulator/ sensor-simulator/
COPY tsconfig.json ./

# Build dependencies
RUN npm run build --workspace=shared
RUN npm run build --workspace=sensor-simulator

WORKDIR /app/sensor-simulator
CMD ["npm", "start"]
