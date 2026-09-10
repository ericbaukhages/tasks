build:
	nix develop -c npm run build

test:
	nix develop -c npm run test

serve:
	nix develop -c npm run serve

mcp:
	nix develop -c npm run mcp

dev-web:
	nix develop -c npm run dev --workspace=web

check:
	nix flake check
