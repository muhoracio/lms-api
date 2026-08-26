FROM node:24-alpine AS base
WORKDIR /app
RUN apk --no-cache add vips-tools sqlite
COPY ./src/seed/files /files/
COPY ./src/seed/db /db/

FROM base AS dev
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

FROM base AS prod_base
ENV NODE_ENV=development
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM base AS prod
ENV NODE_ENV=production
COPY package*.json .
RUN npm ci --omit=dev
COPY --from=prod_base /app/dist /app/dist
CMD ["node", "dist/index.js"]
