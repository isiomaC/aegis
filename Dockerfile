FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/policy/package.json packages/policy/package.json
RUN pnpm install --frozen-lockfile
COPY apps apps
COPY packages packages
RUN pnpm build

FROM node:24-slim
WORKDIR /app/apps/api
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/web/dist ./public
COPY --from=build /app/packages /app/packages
CMD ["node", "dist/server.js"]
