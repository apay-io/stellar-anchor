FROM node:16.5-alpine As development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

CMD ["node", "dist/main"]


FROM node:16.5-alpine as production

WORKDIR /usr/src/app

COPY package*.json ./

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

RUN npm ci --only=production

COPY --from=development /usr/src/app/dist ./dist
COPY --from=development /usr/src/app/views ./views

CMD ["node", "dist/main"]
