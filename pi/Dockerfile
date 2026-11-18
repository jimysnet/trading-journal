FROM node:22-slim
WORKDIR /app
COPY server.mjs .
ENV NODE_ENV=production DATA_DIR=/data PORT=8787 NODE_NO_WARNINGS=1
EXPOSE 8787
HEALTHCHECK --interval=60s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
