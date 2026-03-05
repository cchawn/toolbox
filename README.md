# Toolbox

A collection of CLI tools for day-to-day productivity.

## Install

Download the latest binary from
[GitHub Releases](https://github.com/cchawn/toolbox/releases) and add it to your
`PATH`.

Or build from source:

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

### Cleanup

#### `toolbox cleanup old-dirs`

Remove directories not modified in the last 180 days. Dry run by default.

```bash
toolbox cleanup old-dirs <directory> [--delete]
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
