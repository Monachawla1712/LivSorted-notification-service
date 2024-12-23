FROM node:16-alpine As development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM node:16-alpine As build
WORKDIR /app
COPY package*.json ./
COPY --from=development /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm ci && npm cache clean --force

FROM node:16-alpine As production
COPY .env .
ENV NEW_RELIC_NO_CONFIG_FILE=true
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
CMD [ "node", "dist/src/main.js" ]