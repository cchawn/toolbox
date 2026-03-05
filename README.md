# Toolbox

A collection of CLI scripts to aid in day-to-day productivity.

## Setup

Requires [Deno](https://deno.com/) (`brew install deno`).

Then run the setup task to install remaining dependencies:

```bash
deno task setup
```

## Available Tools

### Git

#### `git:contribution-stats`

Get detailed contribution statistics for a GitHub user, including commits
landed, pull requests opened/closed, reviews given, and currently open PRs.

```bash
deno task git:contribution-stats --user <username> --days <number>
```

**Options:**

- `--user, -u <username>`: GitHub username to get stats for (required)
- `--days, -d <number>`: Number of days to look back (default: 7)
- `--help, -h`: Show help message

**Environment Variables:**

- `GITHUB_TOKEN`: GitHub personal access token (required)

#### `git:update-repos`

Update all git repositories in a workspace directory by checking out the main
branch, pulling latest changes, and optionally cleaning up old branches.

```bash
deno task git:update-repos /path/to/workspace [--cleanup-branches]
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

### Budget

#### `budget:parse-transactions`

Parse CSV transaction files from multiple financial institutions and convert to unified budget format with auto-categorization.

```bash
deno task budget:parse-transactions /path/to/statements/directory
```

**Supported formats:**
- TD Credit Card
- Wealthsimple Credit Card & Investment
- Amex Credit Card
- Scotiabank Chequing

### Cleanup

#### `cleanup:old-dirs`

Remove directories not modified in the last 180 days. Dry run by default.

```bash
deno task cleanup:old-dirs /path/to/directory [--delete]
```

**Options:**

- `--delete`: Actually remove directories (default is dry run with confirmation prompt)
- `--help, -h`: Show help message

## Development

To see all available tasks:

```bash
deno task
```
