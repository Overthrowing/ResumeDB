# syntax=docker/dockerfile:1

FROM node:22-alpine AS node-runtime
FROM ghcr.io/typst/typst:0.14.2 AS typst-runtime
FROM python:3.12-alpine

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    DISABLE_AUTOUPDATER=1

COPY --from=ghcr.io/astral-sh/uv:0.11.25 /uv /uvx /bin/
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
COPY --from=node-runtime /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=typst-runtime /bin/typst /usr/local/bin/typst

RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && apk add --no-cache ca-certificates curl git libstdc++ su-exec \
    && npm install --global @openai/codex@0.144.6 @anthropic-ai/claude-code@2.1.215 \
    && npm cache clean --force

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend ./backend
COPY deploy/start-backend.sh ./deploy/start-backend.sh

RUN addgroup -S resumedb \
    && adduser -S -G resumedb -h /home/resumedb resumedb \
    && chmod +x ./deploy/start-backend.sh

EXPOSE 8000

CMD ["./deploy/start-backend.sh"]
