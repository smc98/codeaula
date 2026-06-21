FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --no-fund --no-audit

COPY . .

EXPOSE 5173

# El servidor de desarrollo de Vite sirve los cambios en tiempo real.
# Para un entorno de producción real habría que hacer `npm run build`
# y servir /app/dist con Nginx, pero en el aula el modo dev es suficiente.
CMD ["npm", "run", "dev"]
