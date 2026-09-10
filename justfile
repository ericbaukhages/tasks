build:
	nix develop -c npm run build

test:
	nix develop -c npm run test

lint:
	nix develop -c npm run lint

format:
	nix develop -c npm run format

clean:
	nix develop -c npm run clean

serve:
	nix develop -c npm run serve

mcp:
	nix develop -c npm run mcp

dev-web:
	nix develop -c npm run dev-web

check:
	nix flake check

preview-pages:
	nix develop -c python3 -m http.server 4000 --directory docs
