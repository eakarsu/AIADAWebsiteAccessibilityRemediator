#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; test -f "$root/.env" || cp "$root/.env.example" "$root/.env"
(cd "$root/server" && npm ci); (cd "$root/client" && npm ci)
echo 'Dependencies installed. Configure .env, then run scripts/migrate.sh.'
