# Build stage
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Set environment variable for build
ARG REACT_APP_BACKEND_URL

# Build the application with the env variable
RUN REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL npm run build

# Production stage
FROM nginx:alpine

# Copy built application
COPY --from=build /app/build /usr/share/nginx/html

# Create a simple nginx configuration
RUN echo 'events { worker_connections 1024; } http { include /etc/nginx/mime.types; default_type application/octet-stream; server { listen 8080; server_name localhost; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } location /health { return 200 "healthy\n"; add_header Content-Type text/plain; } } }' > /etc/nginx/nginx.conf

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
 