FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

# NOTE: App port
EXPOSE 3000

# NOTE: Debugger port
EXPOSE 9229
EXPOSE 9230

CMD ["npm", "start"]
