# syntax=docker/dockerfile:1

ARG NODE_VERSION=20

# Use a minimal and secure Node.js base image
FROM public.ecr.aws/docker/library/node:${NODE_VERSION}-alpine

# Use production node environment by default
ENV NODE_ENV=production

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

COPY package*.json ./

# Switch to non-root user
USER node

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Run npm audit fix as root user to avoid permission issues
USER root
RUN npm audit fix || true

# Switch back to non-root user and copy the application code
USER node
COPY --chown=node:node . .

# Expose the port that the application listens on
EXPOSE 3000

# Run the application
CMD [ "npm", "start" ]
