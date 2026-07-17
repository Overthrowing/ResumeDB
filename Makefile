.PHONY: dev backend frontend test build

# Run backend (:8000) and frontend dev server (:5173, proxies /api) together
dev:
	$(MAKE) -j2 backend frontend

backend:
	micromamba run -n resumedb uvicorn resumedb.main:app --reload --port 8000 --app-dir backend

frontend:
	cd frontend && pnpm dev

test:
	micromamba run -n resumedb pytest backend/tests -q

build:
	cd frontend && pnpm build
