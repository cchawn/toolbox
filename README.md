# Toolbox

A collection of CLI scripts to aid in day-to-day productivity.

## Setup

To get started with this repo, ensure you have the CLI tool
['just'](https://github.com/casey/just) installed:

```bash
brew install just
```

Then, simply run the `setup` recipe. This will install all the necessary tools
needed for interacting with this repository (setup linters, runtime
environments, etc).

```bash
just setup
```

## Available Tools

### GitHub Contribution Stats

Get detailed contribution statistics for a GitHub user, including commits
landed, pull requests opened/closed, reviews given, and currently open PRs.

**Usage:**

```bash
# Using Deno task
deno task get-contribution-stats --user <username> --days <number>

# Direct execution
deno run --allow-net --allow-env ./github/get-contribution-stats.ts --user <username> --days <number>
```

**Options:**

- `--user, -u <username>`: GitHub username to get stats for (required)
- `--days, -d <number>`: Number of days to look back (default: 7)
- `--help, -h`: Show help message

**Environment Variables:**

- `GITHUB_TOKEN`: GitHub personal access token (required)

### Repository Update Script

Update all git repositories in a workspace directory by checking out the main
branch, pulling latest changes, and optionally cleaning up old branches.

**Usage:**

```bash
# Using Deno task
deno task update-repos /path/to/workspace [--cleanup-branches]

# Direct execution
deno run --allow-read --allow-run --allow-env ./git/update-local-repos.ts /path/to/workspace [--cleanup-branches]
```

**Options:**

- `--cleanup-branches, -c`: Delete local branches that track deleted remote
  branches
- `--help, -h`: Show help message

**What it does:**

- Checks for uncommitted changes (skips repos with changes)
- Switches to main/master branch
- Pulls latest changes from remote
- Optionally deletes local branches tracking deleted remote branches

### Transaction Parser

Parse CSV transaction files from multiple financial institutions and convert to unified budget format with auto-categorization.

**Usage:**

```bash
# Using Deno task
deno task parse-transactions /path/to/statements/directory

# Direct execution
deno run --allow-read --allow-write --allow-env ./budget/transaction-parser.ts /path/to/statements/directory
```

**Supported formats:**
- TD Credit Card
- Wealthsimple Credit Card & Investment
- Amex Credit Card
- Scotiabank Chequing

## Development

To see all the available recipes, run `just` with no arguments:

```
$ just
Available recipes:
    setup              # Set up the repository for development
```
