FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias necesarias para compilar TS aun con NODE_ENV=production
RUN npm ci --include=dev

# Copiar código fuente
COPY . .

# Build
RUN npm run build

# Exponer puerto
EXPOSE 3000

# Comando para ejecutar
CMD ["node", "./dist/main.js"]
