# Release Process

This document describes how releases are managed for dgx-spark-mcp.

## Automated Releases

Releases are fully automated using semantic-release. When code is merged to `main`:

1. Semantic-release analyzes commit messages
2. Determines the next version number (major, minor, patch)
3. Generates CHANGELOG.md
4. Creates a Git tag
5. Publishes to npm
6. Creates a GitHub release

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add new feature` → minor version bump
- `fix: resolve bug` → patch version bump
- `feat!: breaking change` → major version bump
- `docs: update readme` → no version bump (unless README)
- `chore: update deps` → no version bump

### Examples

```bash
# New feature
git commit -m "feat: add GPU topology detection"

# Bug fix
git commit -m "fix: correct memory calculation in estimator"

# Breaking change
git commit -m "feat!: change resource API interface

BREAKING CHANGE: Resource.estimate() now returns Promise<ResourceEstimate>"

# Documentation
git commit -m "docs: add installation examples"
```

## Testing Releases

Before pushing to main, test the release locally:

```bash
# Dry run to see what would be released
npm run release:dry-run

# Check what the next version would be
npm run version:check
```

## Manual Version Bumps (Emergency)

If automated release fails:

```bash
# Patch version (0.1.0 → 0.1.1)
npm run version:patch

# Minor version (0.1.0 → 0.2.0)
npm run version:minor

# Major version (0.1.0 → 1.0.0)
npm run version:major

# Then manually publish
npm publish
```

## Troubleshooting

### Release fails with "ENOENT: no such file or directory"

Ensure build artifacts exist:

```bash
npm run build
ls -la dist/
```

### "No release published" message

Check commit messages follow conventional format:

```bash
git log --oneline -10
```

### npm authentication fails

Verify NPM_TOKEN is set in GitHub Secrets and hasn't expired.
