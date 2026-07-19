.PHONY: dev backend frontend test build sync

# Run backend (:8000) and frontend dev server (:5173, proxies /api) together.
# Force-syncs scaffold boilerplate into the data repo first, so edits to skills,
# CLAUDE.md, and templates/ propagate on every dev start.
dev: sync
	$(MAKE) -j2 backend frontend

# Overwrite the data repo's app-authored boilerplate (skills, CLAUDE.md,
# template contract) from scaffold/. Never touches db/, applications/, proposals/.
sync:
	cd backend && uv run python -m resumedb.datarepo

backend:
	uv run uvicorn resumedb.main:app --reload --port 8000 --app-dir backend

frontend:
	cd frontend && pnpm dev

test:
	uv run pytest backend/tests -q

build:
	cd frontend && pnpm build
