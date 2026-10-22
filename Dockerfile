# Use Node image
FROM node:24-alpine

# Set working directory
WORKDIR /app

# CRA substitutes REACT_APP_* values while compiling. This is a public
# Razorpay checkout identifier, supplied by CI as a build argument; private
# runtime .env files remain excluded from the Docker context.
ARG REACT_APP_RAZORPAY_KEY_ID
ENV REACT_APP_RAZORPAY_KEY_ID=$REACT_APP_RAZORPAY_KEY_ID

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build React app
RUN node scripts/verifyRazorpayBuild.js && npm run build

# Install serve to serve static files (gzip on by default; caching rules in public/serve.json)
RUN npm install -g serve@14.2.4

# Expose port
EXPOSE 8080

# Start app
CMD ["serve", "-s", "build", "-l", "8080"]
