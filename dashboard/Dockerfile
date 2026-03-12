FROM node:20-alpine

WORKDIR /app

# Copy root package.json and workspaces
COPY package*.json ./
COPY dashboard/package.json dashboard/

RUN npm install

# Copy source
COPY dashboard/ dashboard/
COPY tsconfig.base.json ./

# Build won't be necessary for dev server, but we will run the vite dev server
WORKDIR /app/dashboard
CMD ["npm", "run", "dev", "--", "--host"]
