FROM node:22-alpine AS build
WORKDIR /app
# package-lock.json* — файл появится после первого `npm install`
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build -- --configuration=production

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/proxy_params /etc/nginx/proxy_params
COPY --from=build /app/dist/millarym-front/browser /app/frontend
