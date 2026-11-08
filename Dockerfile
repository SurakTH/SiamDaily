FROM node:20-alpine

# Install Docker CLI for container status monitoring
RUN apk add --no-cache docker-cli

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy app source code
COPY . .

# Expose port
EXPOSE 8000

# Start server
CMD ["node", "server.js"]
