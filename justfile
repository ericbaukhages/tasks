build:
	nix develop -c npm run build

test:
	nix develop -c npm run test

lint:
	nix develop -c npm run lint

serve:
	nix develop -c npm run serve

mcp:
	nix develop -c npm run mcp

dev-web:
	nix develop -c npm run dev --workspace=web

check:
	nix flake check

preview-pages:
	nix develop -c python3 -m http.server 4000 --directory docs
