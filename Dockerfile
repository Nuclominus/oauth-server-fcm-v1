# syntax=docker/dockerfile:1

ARG NODE_VERSION=20

FROM public.ecr.aws/docker/library/node:${NODE_VERSION}-alpine

# Use production node environment by default.
ENV NODE_ENV=production

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

COPY package*.json ./

# Run the application as a non-root user.
USER node

RUN npm ci && npm cache clean --force

# Copy the rest of the source files into the image.
COPY --chown=node:node . .

# Expose the port that the application listens on.
EXPOSE 3000

# Run the application.
CMD [ "npm", "start" ]
