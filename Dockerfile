FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /app
COPY --from=build /app/public/le-petit-livre-bleu.pdf /app/le-petit-livre-bleu.pdf
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
