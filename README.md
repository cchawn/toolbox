# Toolbox

A collection of CLI tools for day-to-day productivity.

## Install

### From GitHub Releases

```bash
# macOS (Apple Silicon)
curl -Lo /usr/local/bin/toolbox https://github.com/cchawn/toolbox/releases/latest/download/toolbox-darwin-arm64 && chmod +x /usr/local/bin/toolbox

# Linux (x86_64)
curl -Lo /usr/local/bin/toolbox https://github.com/cchawn/toolbox/releases/latest/download/toolbox-linux-amd64 && chmod +x /usr/local/bin/toolbox
```

### From source

```bash
brew install deno
git clone https://github.com/cchawn/toolbox.git
cd toolbox
deno task compile
```

## Usage

```
toolbox <group> <command> [options]
```

Run `toolbox --help` to see all commands, or `toolbox <group> --help` for
commands in a group.

## Commands

### Git

#### `toolbox git contribution-stats`

Get contribution statistics for a GitHub user.

```bash
toolbox git contribution-stats --user <username> --days <number>
```

**Options:**

- `-u, --user <name>`: GitHub username (required)
- `-d, --days <num>`: Days to look back (default: 7)

**Environment Variables:**

- `GITHUB_TOKEN`: GitHub personal access token (required)

#### `toolbox git update-repos`

Update all git repos in a workspace directory by checking out main, pulling
latest, and optionally cleaning up stale branches.

```bash
toolbox git update-repos <directory> [--cleanup-branches]
```

**Options:**

- `-c, --cleanup-branches`: Delete local branches tracking deleted remotes

### Budget

#### `toolbox budget parse-transactions`

Parse CSV transaction files from multiple financial institutions and convert to
unified budget format with auto-categorization.

```bash
toolbox budget parse-transactions <input_path> [--output <file>]
```

**Options:**

- `-o, --output <file>`: Output CSV file (default: auto-generated)
- `-d, --directory`: Treat input as directory

**Supported formats:**

- TD Credit Card
- Wealthsimple Credit Card & Investment
- Amex Credit Card
- Scotiabank Chequing

#### `toolbox budget init-config`

Generate a default budget config file for customizing merchant categorization.

```bash
toolbox budget init-config [--force]
```

Writes default mappings to `~/.config/toolbox/budget.json`. Edit this file to
customize how transactions are categorized.

#### `toolbox git cleanup-old`

Remove git repositories not modified in the last 180 days. Only targets
directories containing a `.git` folder. Dry run by default.

```bash
toolbox git cleanup-old <directory> [--delete]
```

**Options:**

- `--delete`: Actually remove directories (default is dry run with confirmation
  prompt)

## Configuration

Budget merchant mappings are stored in `~/.config/toolbox/budget.json`. Generate
the default config with:

```bash
toolbox budget init-config
```

The config has two sections:

- `exactMatches`: Map merchant names to categories (exact substring match)
- `keywordPatterns`: Map categories to keyword arrays (broader matching)

## Development

Requires [Deno](https://deno.com/) (`brew install deno`).

```bash
# Run in dev mode
deno task dev -- <group> <command> [options]

# Type check
deno check cli.ts

# Compile binary
deno task compile

# Compile for Linux
deno task compile:linux
```
