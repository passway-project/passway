FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE ${INTERNAL_AUTHENTICATION_APP_PORT}
CMD ["npm", "start"]
