# Use the official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create workspace and data directories and change ownership
RUN mkdir -p /workspace /workspace/data
RUN chown -R nodejs:nodejs /app /workspace
USER nodejs

# Expose port (if needed for HTTP mode)
EXPOSE 3000

# Default command to run the MCP server in stdio mode (for MCP clients)
CMD ["npm", "run", "start:docker"]
