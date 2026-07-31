.PHONY: dev backend frontend test build sync

# Run backend (:8000) and frontend dev server (:5173, proxies /api) together.
# Force-syncs scaffold boilerplate into the data repo first, so edits to skills,
# CLAUDE.md, and templates/ propagate on every dev start.
dev: sync
	@if lsof -ti tcp:8000 >/dev/null 2>&1; then \
		echo "error: port 8000 is already taken (a stale backend?):"; \
		lsof -i tcp:8000 -P | tail -n +2; \
		echo "kill it first: kill $$(lsof -ti tcp:8000)"; \
		exit 1; \
	fi
	$(MAKE) -j2 backend frontend

# Overwrite the data repo's app-authored boilerplate (skills, CLAUDE.md,
# template contract) from scaffold/. Never touches db/, applications/, proposals/.
sync:
	cd backend && uv run python -m resumedb.datarepo

# Backend only. --reload also puts main.py in dev mode, where :8000 serves the
# API and points at :5173 instead of handing out a stale frontend/dist build.
backend:
	uv run uvicorn resumedb.main:app --reload --port 8000 --app-dir backend

frontend:
	cd frontend && pnpm dev

# Backend test suite. uv run provisions .venv from uv.lock on first use.
test:
	uv run pytest backend/tests -q

# Production frontend bundle into frontend/dist, which a non-reload backend
# serves itself on :8000.
build:
	cd frontend && pnpm build
