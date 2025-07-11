bash_flags := "-e -o pipefail"

[private]
@default:
  just --list --unsorted

# Set up the repository for development
setup:
  #!/usr/bin/env bash
  set {{bash_flags}}
  just ensure-npx
  just ensure-cmd "deno" "brew install deno"
  just ensure-cmd "direnv" "brew install direnv" "true"

[private]
[no-exit-message]
ensure-npx:
  #!/usr/bin/env bash
  set {{bash_flags}}
  just ensure-cmd "npx" "echo 'npx was not found. is nodejs installed?' >&2; exit 1"

[private]
ensure-cmd cmd script skip_ci='false':
  #!/usr/bin/env bash
  set {{bash_flags}}

  if command -v "{{cmd}}" > /dev/null; then
    exit 0
  fi

  if [[ "${CI}" != "true" ]]; then
    echo "Installing {{cmd}} ..."
    {{script}}
    exit 0
  fi

  if [[ "{{skip_ci}}" == "true" ]]; then
    echo "Skipping install of {{cmd}} in CI"
    exit 0
  fi

  echo "Don't know how to install tool {{cmd}}".
  exit 1
