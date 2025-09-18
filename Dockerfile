# Development stage
FROM node:18-alpine AS development

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=development

COPY . .

RUN npm run build

# Production stage
FROM node:18-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --from=development /usr/src/app/dist ./dist

# Create uploads directory
RUN mkdir -p uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of uploads directory
RUN chown -R nestjs:nodejs uploads

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main"]