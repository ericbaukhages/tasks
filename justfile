build:
	npm run build

test:
	npm run test

serve:
	npm run serve

mcp:
	npm run mcp

dev-web:
	npm run dev --workspace=web

check:
	nix flake check
