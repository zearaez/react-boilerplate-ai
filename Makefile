# One-command setup and the handful of commands worth memorising (audit 14.2).
# Everything here delegates to pnpm scripts — the Makefile is a front door, not a
# second build system.

.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help setup dev web mobile mock check fix build audit clean reset

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

setup: ## One-command local setup (run this first)
	@bash scripts/setup.sh

dev: ## Run the mock API, the web app and Expo together
	@pnpm mock & pnpm dev

web: ## Web app only (http://localhost:5173)
	@pnpm dev:web

mobile: ## Expo dev server (start `make mock` in another terminal first)
	@pnpm dev:mobile

mock: ## Mock API only (http://localhost:4000)
	@pnpm mock

check: ## The full gate: lint, types, format, tests + coverage, dep sanity
	@pnpm quality:check

fix: ## Autofix lint and formatting
	@pnpm fix

build: ## Build the web app and verify its CSS output
	@pnpm --filter @repo/web build
	@node scripts/assert-css-output.mjs apps/web/dist

audit: ## Expo doctor + duplicate-dependency check
	@pnpm doctor

clean: ## Remove build output and caches (keeps node_modules)
	@rm -rf apps/*/dist apps/*/.expo coverage .turbo packages/*/dist
	@echo "Cleaned build output."

reset: clean ## Also remove node_modules and reinstall from the lockfile
	@find . -name node_modules -type d -prune -exec rm -rf {} +
	@pnpm install --frozen-lockfile
