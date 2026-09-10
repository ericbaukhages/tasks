{
  description = "MCP-first personal task management system";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        checks = {
          static-invariants = pkgs.runCommand "static-invariants"
            {
              nativeBuildInputs = [ pkgs.gnugrep pkgs.jq ];
            }
            ''
              mkdir -p $out

              if ! grep -q "Persistence  (SQLite via node:sqlite)" ${./README.md}; then
                echo "README architecture diagram must mention node:sqlite"
                exit 1
              fi

              if grep -q "better-sqlite3" ${./README.md}; then
                echo "README must not mention better-sqlite3"
                exit 1
              fi

              for f in ${./package.json} ${./server/package.json} ${./web/package.json}; do
                version=$(jq -r '.engines.node // empty' "$f")
                if [ "$version" != ">=22.13.0" ]; then
                  echo "$f engines.node must be >=22.13.0, got: $version"
                  exit 1
                fi
              done

              if grep -q "No web tests yet" ${./web/package.json}; then
                echo "web/package.json test script must not be a placeholder"
                exit 1
              fi
            '';
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs
            just
            git
            sqlite
            python3
          ];
        };
      });
}
