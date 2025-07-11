# Toolbox

### Setup

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

To see all the available recipes, run `just` with no arguments:

```
$ just
Available recipes:
    setup              # Set up the repository for development
```
