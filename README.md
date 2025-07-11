# Toolbox

A collection of CLI scripts to aid in day-to-day productivity.

## Setup

To get started with this repo, ensure you have the CLI tool
['just'](https://github.com/casey/just) installed:

```bash
brew install just
```

Then, simply run the `setup` recipe. This will install all the necessary tools
needed for interacting with this repository (setup linters,
runtime environments, etc).

```bash
just setup
```

## Available Tools

### GitHub Contribution Stats

Get detailed contribution statistics for a GitHub user, including commits landed, pull requests opened/closed, reviews given, and currently open PRs.

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

**Example:**
```bash
export GITHUB_TOKEN="your_github_token_here"
deno task get-contribution-stats --user octocat --days 30
```

**Output includes:**
- Commits landed to main/master branches
- Pull requests opened and closed
- PR reviews given
- Currently open pull requests with links

## Development

To see all the available recipes, run `just` with no arguments:

```
$ just
Available recipes:
    setup              # Set up the repository for development
```
