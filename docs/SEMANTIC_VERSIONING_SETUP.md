# Semantic Versioning and Release Automation Setup Guide

**Status**: Not yet implemented
**Priority**: High (required for npm publishing)
**Related Issue**: #18

---

## Overview

This guide provides step-by-step instructions for implementing semantic versioning, automated releases, and conventional commits in the dgx-spark-mcp repository. This setup is essential for maintaining quality npm packages and follows industry best practices.

## Why This Matters

- **Automated Versioning**: Automatically determine the next version based on commits
- **Changelog Generation**: Auto-generate changelogs from commit messages
- **Quality Control**: Enforce commit message standards
- **Release Automation**: Streamline the release process to npm
- **Git Hygiene**: Ensure consistent commit history across the team

## Prerequisites

Before starting, ensure you have:
- Node.js 18.0.0 or higher
- npm or pnpm installed
- Write access to the repository
- Familiarity with conventional commits

## Implementation Steps

### Step 1: Install Semantic Release Dependencies

Add the following devDependencies to `package.json`:

```bash
npm install --save-dev \
  semantic-release \
  @semantic-release/changelog \
  @semantic-release/git \
  @semantic-release/github \
  @semantic-release/npm \
  @semantic-release/commit-analyzer \
  @semantic-release/release-notes-generator
```

**Explanation**: These packages handle automated versioning, changelog generation, and publishing.

### Step 2: Install Commitlint and Husky

Add commit message linting and git hooks:

```bash
npm install --save-dev \
  @commitlint/cli \
  @commitlint/config-conventional \
  husky \
  lint-staged
```

**Explanation**: Commitlint enforces conventional commit format, Husky manages git hooks.

### Step 3: Configure Commitlint

Create `.commitlintrc.json` in the repository root:

```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert"
      ]
    ],
    "subject-case": [2, "never", ["upper-case", "pascal-case"]],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 100]
  }
}
```

**Purpose**: Enforces conventional commit format (e.g., `feat: add feature`, `fix: resolve bug`).

### Step 4: Configure Semantic Release

Create `.releaserc.json` in the repository root:

```json
{
  "branches": ["main"],
  "repositoryUrl": "https://github.com/raibid-labs/dgx-spark-mcp.git",
  "plugins": [
    [
      "@semantic-release/commit-analyzer",
      {
        "preset": "conventionalcommits",
        "releaseRules": [
          { "type": "feat", "release": "minor" },
          { "type": "fix", "release": "patch" },
          { "type": "perf", "release": "patch" },
          { "type": "revert", "release": "patch" },
          { "type": "docs", "scope": "README", "release": "patch" },
          { "type": "refactor", "release": "patch" },
          { "type": "style", "release": false },
          { "type": "chore", "release": false },
          { "type": "test", "release": false },
          { "breaking": true, "release": "major" }
        ]
      }
    ],
    [
      "@semantic-release/release-notes-generator",
      {
        "preset": "conventionalcommits",
        "presetConfig": {
          "types": [
            { "type": "feat", "section": "✨ Features" },
            { "type": "fix", "section": "🐛 Bug Fixes" },
            { "type": "perf", "section": "⚡ Performance Improvements" },
            { "type": "revert", "section": "⏪ Reverts" },
            { "type": "docs", "section": "📚 Documentation" },
            { "type": "refactor", "section": "♻️ Code Refactoring" },
            { "type": "test", "section": "✅ Tests" },
            { "type": "build", "section": "🏗️ Build System" },
            { "type": "ci", "section": "👷 CI/CD" }
          ]
        }
      }
    ],
    [
      "@semantic-release/changelog",
      {
        "changelogFile": "CHANGELOG.md",
        "changelogTitle": "# Changelog\n\nAll notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines."
      }
    ],
    [
      "@semantic-release/npm",
      {
        "npmPublish": true,
        "tarballDir": "dist"
      }
    ],
    [
      "@semantic-release/git",
      {
        "assets": ["package.json", "package-lock.json", "CHANGELOG.md"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ],
    [
      "@semantic-release/github",
      {
        "assets": [
          {
            "path": "dist/*.tgz",
            "label": "Distribution package"
          }
        ]
      }
    ]
  ]
}
```

**Purpose**: Configures how semantic-release analyzes commits, generates changelogs, and publishes releases.

### Step 5: Setup Husky Git Hooks

Initialize Husky:

```bash
# Initialize Husky
npx husky init

# Create commit-msg hook
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
chmod +x .husky/commit-msg

# Create pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
chmod +x .husky/pre-commit
```

**Purpose**: Automatically validate commit messages and run linters before commits.

### Step 6: Configure Lint-Staged

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

**Purpose**: Auto-format and lint staged files before commits.

### Step 7: Add Release Scripts

Update the `scripts` section in `package.json`:

```json
{
  "scripts": {
    "release": "semantic-release",
    "release:dry-run": "semantic-release --dry-run",
    "version:check": "semantic-release --dry-run --no-ci",
    "version:patch": "npm version patch -m 'chore(release): %s'",
    "version:minor": "npm version minor -m 'chore(release): %s'",
    "version:major": "npm version major -m 'chore(release): %s'",
    "changelog:preview": "conventional-changelog -p conventionalcommits -u"
  }
}
```

**Purpose**: Provides commands for manual and automated releases.

### Step 8: Create GitHub Actions Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches:
      - main

permissions:
  contents: write
  issues: write
  pull-requests: write
  id-token: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    if: "!contains(github.event.head_commit.message, '[skip ci]')"

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Verify package
        run: |
          npm pack
          tar -tzf dgx-spark-mcp-*.tgz

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

**Purpose**: Automatically releases new versions when code is merged to main.

### Step 9: Create GitHub Actions Workflow for PR Validation

Create `.github/workflows/validate-commits.yml`:

```yaml
name: Validate Commits

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  commitlint:
    name: Validate commit messages
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Validate commit messages
        run: npx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose
```

**Purpose**: Validates commit messages in PRs before merging.

### Step 10: Setup npm Token

To enable automated npm publishing:

1. Create npm access token:
   - Login to [npmjs.com](https://www.npmjs.com/)
   - Go to Access Tokens → Generate New Token
   - Select "Automation" type
   - Copy the token

2. Add to GitHub Secrets:
   - Go to repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: [paste your token]
   - Click "Add secret"

### Step 11: Create Initial CHANGELOG.md

Create `CHANGELOG.md` in the repository root:

```markdown
# Changelog

All notable changes to this project will be documented in this file. See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.
```

**Purpose**: Semantic-release will automatically update this file with each release.

### Step 12: Update package.json Metadata

Ensure these fields are correct in `package.json`:

```json
{
  "version": "0.1.0",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/raibid-labs/dgx-spark-mcp.git"
  },
  "bugs": {
    "url": "https://github.com/raibid-labs/dgx-spark-mcp/issues"
  },
  "homepage": "https://github.com/raibid-labs/dgx-spark-mcp#readme"
}
```

### Step 13: Create Release Documentation

Create `docs/RELEASING.md`:

```markdown
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
```

## Validation Checklist

After completing all steps, verify:

- [ ] All packages installed: `npm install`
- [ ] Commitlint works: Try making a bad commit
- [ ] Husky hooks active: `ls -la .husky/`
- [ ] Dry run succeeds: `npm run release:dry-run`
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Package can be packed: `npm pack`
- [ ] GitHub Actions workflow files exist
- [ ] NPM_TOKEN secret is set in GitHub
- [ ] CHANGELOG.md exists

## Testing the Setup

### Test 1: Conventional Commit Enforcement

```bash
# This should FAIL (invalid format)
git commit -m "updated readme"

# This should SUCCEED
git commit -m "docs: update README with examples"
```

### Test 2: Dry Run Release

```bash
npm run release:dry-run
```

Expected output:
- Analysis of commits
- Next version calculation
- Generated release notes
- No actual release (dry run)

### Test 3: Changelog Preview

```bash
npm run changelog:preview
```

Expected output: Preview of what would go in CHANGELOG.md

## Common Conventional Commit Types

| Type | Description | Version Bump | Example |
|------|-------------|--------------|---------|
| `feat` | New feature | minor | `feat: add hardware monitoring` |
| `fix` | Bug fix | patch | `fix: resolve memory leak` |
| `docs` | Documentation only | none* | `docs: update API reference` |
| `style` | Code style changes | none | `style: format with prettier` |
| `refactor` | Code refactoring | patch | `refactor: simplify config parser` |
| `perf` | Performance improvement | patch | `perf: optimize GPU detection` |
| `test` | Add/update tests | none | `test: add integration tests` |
| `build` | Build system changes | none | `build: update tsconfig` |
| `ci` | CI/CD changes | none | `ci: add release workflow` |
| `chore` | Other changes | none | `chore: update dependencies` |
| `revert` | Revert previous commit | patch | `revert: undo feature X` |

*`docs` changes to README.md trigger a patch release

## Breaking Changes

To indicate a breaking change, use `!` or `BREAKING CHANGE:` in the commit body:

```bash
# Method 1: Using !
git commit -m "feat!: change API interface"

# Method 2: Using BREAKING CHANGE in body
git commit -m "feat: update resource API

BREAKING CHANGE: Resource.estimate() signature changed"
```

Both trigger a **major** version bump.

## Release Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Workflow                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Make code changes│
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Commit (conv.)   │◄──── Commitlint validates
                    └────────┬─────────┘      Husky enforces
                             │
                             ▼
                    ┌──────────────────┐
                    │ Push to branch   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Create PR        │◄──── GitHub validates commits
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Merge to main    │
                    └────────┬─────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Automated Release (GitHub Actions)              │
├─────────────────────────────────────────────────────────────┤
│  1. Analyze commits                                          │
│  2. Determine next version                                   │
│  3. Generate CHANGELOG                                       │
│  4. Update package.json                                      │
│  5. Create Git tag                                           │
│  6. Build package                                            │
│  7. Publish to npm                                           │
│  8. Create GitHub Release                                    │
└─────────────────────────────────────────────────────────────┘
```

## Additional Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [semantic-release Documentation](https://semantic-release.gitbook.io/)
- [Commitlint Documentation](https://commitlint.js.org/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)

## Questions?

If you encounter issues or have questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review existing [GitHub Issues](https://github.com/raibid-labs/dgx-spark-mcp/issues)
3. Create a new issue with the `release` label

---

**Next Steps**: Follow the implementation steps above in order. Test thoroughly before pushing to main.
