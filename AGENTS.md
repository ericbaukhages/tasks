## Common commands

This project provides a `justfile` for common tasks. The Node-based recipes
run inside the Nix dev shell via `nix develop -c` so the correct Node
toolchain is used automatically.

- `just build` — build the project
- `just test` — run tests
- `just serve` — start the server
- `just mcp` — run the MCP server
- `just dev-web` — start the web workspace dev server
- `just check` — run `nix flake check`

## Attribution

Please ensure, if you're assisting commits, that you include a disclaimer, with the current model and harness.
