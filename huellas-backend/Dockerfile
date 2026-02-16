FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Build
RUN npm run build

# Exponer puerto
EXPOSE 3000

# Comando para ejecutar
CMD ["npm", "run", "start:prod"]
