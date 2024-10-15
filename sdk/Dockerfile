FROM node:20

WORKDIR /usr/src/app

COPY . .
RUN npm ci
RUN npx -y playwright@1.48.0 install --with-deps

EXPOSE 3000

CMD ["npm", "start"]
