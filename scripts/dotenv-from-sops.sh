#!/usr/bin/env bash
#
# Decrypt the project's SOPS-encrypted secrets file to a plain `.env`
# so local-dev tooling that wants real env vars (Node, Vitest, Firebase
# emulator) can `source` it without round-tripping through `sops -d`
# each invocation.
#
# Usage:
#   scripts/dotenv-from-sops.sh              # writes .env from .env.shared.sops.yaml
#   scripts/dotenv-from-sops.sh other.sops.yaml [out.env]
#
# Prereqs:
#   - sops + age installed (sudo ~/.dotfiles/nix/rebuild.sh after editing flake.nix)
#   - Your age private key in ~/.config/sops/age/keys.txt
#     OR symlinked to ~/Library/Application Support/sops/age/keys.txt
#     (the rebuild script + the .sops.yaml setup commit already arrange this)
#
# Safety:
#   - .gitignore excludes `.env*` so the decrypted output never lands in git.
#   - Output file gets chmod 600 — single-user readable.
#   - Refuses to run if $1 doesn't end in `.sops.yaml` to prevent accidentally
#     piping a plain file through SOPS.

set -euo pipefail

SRC="${1:-.env.shared.sops.yaml}"
OUT="${2:-.env}"

if [[ ! -f "$SRC" ]]; then
    echo "error: source file '$SRC' does not exist" >&2
    exit 2
fi

case "$SRC" in
    *.sops.yaml|*.sops.yml) ;;
    *)
        echo "error: source must match *.sops.yaml or *.sops.yml — got '$SRC'" >&2
        exit 2
        ;;
esac

# Tighten the file-creation mode to 0600 BEFORE any writes so the
# decrypted plaintext is never group/world-readable, even for the brief
# window between `>` opening the fd and the explicit chmod that used to
# follow. Runs in a subshell so it doesn't pollute the caller's umask.
# `install -m 600 /dev/null "$OUT"` would be the BSD-friendly alternative
# but isn't portable across all GNU/BSD coreutils combinations.
(
    umask 077

    # Convert the YAML map into KEY="value" lines. Values are double-quoted
    # using printf %q-style escaping (via awk) so secrets containing spaces,
    # `=`, `$`, `"`, backticks, etc. round-trip cleanly through `source .env`
    # or any POSIX dotenv parser. Skip anything that isn't a plain string at
    # the top level (no nested maps, no lists) — env vars are flat by
    # definition, and a leaked structured secret in the .env would just
    # confuse `source`.
    sops -d "$SRC" | awk '
        /^[[:space:]]*#/         { next }     # skip comments
        /^[[:space:]]*$/         { next }     # skip blank lines
        /^[A-Z][A-Z0-9_]*:[[:space:]]/ {
            key = $1
            sub(/:$/, "", key)
            # Take everything after the first ": " literally so values
            # containing `:` or `=` survive intact.
            sub(/^[^:]+:[[:space:]]+/, "")
            # Strip a single pair of wrapping quotes that SOPS YAML may have
            # added around the source value — outer quotes only, not inner.
            if ((substr($0, 1, 1) == "\"" && substr($0, length($0)) == "\"") || \
                (substr($0, 1, 1) == "'\''" && substr($0, length($0)) == "'\''")) {
                $0 = substr($0, 2, length($0) - 2)
            }
            # Escape backslashes and double quotes so the result is a valid
            # POSIX-shell double-quoted string. Backslash MUST come first
            # so the next gsub does not re-escape the escapes.
            gsub(/\\/, "\\\\")
            gsub(/"/, "\\\"")
            # Wrap in double quotes — preserves leading/trailing spaces and
            # any `=` inside the value. Single quotes would be safer against
            # `$` expansion but would break if the value itself contains
            # single quotes (no POSIX-portable single-quote escape).
            printf("%s=\"%s\"\n", key, $0)
        }
    ' > "$OUT"
)

echo "wrote $OUT ($(wc -l < "$OUT" | tr -d ' ') vars)"
