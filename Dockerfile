# Use Node image
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build React app
RUN npm run build

# Install serve to serve static files (gzip on by default; caching rules in public/serve.json)
RUN npm install -g serve@14.2.4

# Expose port
EXPOSE 8080

# Start app
CMD ["serve", "-s", "build", "-l", "8080"]
