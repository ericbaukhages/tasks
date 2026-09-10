{
  description = "MCP-first personal task management system";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forEachSystem = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
      npmDepsHash = "sha256-j+0v1uDyUfzXVNR253GVGT1lfM7SBoDZ/MnUjZglhSs=";
    in
    {
      checks = forEachSystem (pkgs: {
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

            for f in ${./package.json} ${./server/package.json} ${./web/package.json} ${./packages/types/package.json}; do
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

        node-version = pkgs.runCommand "node-version"
          {
            nativeBuildInputs = [ pkgs.nodejs_22 ];
          }
          ''
            mkdir -p $out
            major=$(node --version | cut -d. -f1 | tr -d 'v')
            if [ "$major" -lt 22 ]; then
              echo "Node must be >=22, got $(node --version)"
              exit 1
            fi
          '';

        build = pkgs.buildNpmPackage {
          pname = "tasks-build";
          version = "0.1.0";
          src = self;
          nodejs = pkgs.nodejs_22;
          inherit npmDepsHash;
          npmBuildScript = "build";
          dontNpmTest = true;
          installPhase = "mkdir -p $out";
        };

        test = pkgs.buildNpmPackage {
          pname = "tasks-test";
          version = "0.1.0";
          src = self;
          nodejs = pkgs.nodejs_22;
          inherit npmDepsHash;
          npmBuildScript = "build";
          npmTestScript = "test";
          installPhase = "mkdir -p $out";
        };

        lint = pkgs.buildNpmPackage {
          pname = "tasks-lint";
          version = "0.1.0";
          src = self;
          nodejs = pkgs.nodejs_22;
          inherit npmDepsHash;
          npmBuildScript = "lint";
          dontNpmTest = true;
          installPhase = "mkdir -p $out";
        };
      });

      devShells = forEachSystem (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            just
            git
            sqlite
            python3
          ];
        };
      });
    };
}
