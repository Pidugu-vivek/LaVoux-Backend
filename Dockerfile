# ---------- Base Image ----------
    FROM node:20-bullseye-slim AS base

    # Set working directory
    WORKDIR /app
    
    # ---------- Install Dependencies ----------
    # Copy package files and install only production dependencies
    COPY package*.json ./
    RUN npm ci --omit=dev
    
    # ---------- Copy Source ----------
    COPY . .
    
    # ---------- Set Environment Variables ----------
    # Never hardcode secrets here — use Docker secrets or environment variables at runtime
    ENV NODE_ENV=production \
        PORT=4000
    
    # ---------- Expose Port ----------
    EXPOSE 4000
    
    # ---------- Start Command ----------
    CMD ["node", "server.js"]
    