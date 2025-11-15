# Contributing to DGX Spark MCP Server

Thank you for your interest in contributing to the DGX Spark MCP Server! This project aims to provide the community with a robust, hardware-aware Spark optimization tool via the Model Context Protocol.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please be respectful, inclusive, and professional in all interactions.

### Our Standards

- **Be Respectful**: Treat everyone with respect and kindness
- **Be Inclusive**: Welcome contributors of all backgrounds and experience levels
- **Be Professional**: Keep discussions focused and constructive
- **Be Collaborative**: Work together towards common goals

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **Git** for version control
- **NVIDIA GPU** and drivers (optional, can use mocked hardware for development)
- **just** command runner (optional but recommended): `cargo install just` or `brew install just`

### Finding Issues to Work On

1. Check the [Issues](https://github.com/raibid-labs/dgx-spark-mcp/issues) page
2. Look for issues labeled `good first issue` or `help wanted`
3. Comment on the issue to let others know you're working on it
4. If you want to work on something not listed, open an issue first to discuss

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/dgx-spark-mcp.git
cd dgx-spark-mcp

# Add upstream remote
git remote add upstream https://github.com/raibid-labs/dgx-spark-mcp.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run with mocked hardware (if you don't have a GPU)
MOCK_HARDWARE=true npm test
```

### 5. Verify Setup

```bash
# Run all quality checks
just check

# Or manually
npm run lint
npm run typecheck
npm test
```

## Development Workflow

### 1. Create a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create a feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clean, readable code
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Or run everything at once
just pre-commit
```

### 4. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new Spark optimization algorithm"
git commit -m "fix: resolve GPU detection issue on multi-GPU systems"
git commit -m "docs: update installation instructions"
git commit -m "test: add integration tests for resource estimation"
```

**Commit types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create a pull request on GitHub
```

## Coding Standards

### TypeScript Style

- Use TypeScript for all new code
- Enable strict type checking
- Avoid `any` type unless absolutely necessary
- Use explicit return types for functions

**Good:**

```typescript
export function calculateOptimalExecutors(totalCores: number, coresPerExecutor: number): number {
  return Math.floor(totalCores / coresPerExecutor);
}
```

**Bad:**

```typescript
export function calculateOptimalExecutors(totalCores: any, coresPerExecutor: any): any {
  return Math.floor(totalCores / coresPerExecutor);
}
```

### Code Organization

- Keep files focused and single-purpose
- Maximum file length: ~300 lines
- Maximum function length: ~50 lines
- Use meaningful variable and function names

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `spark-optimizer.ts`)
- **Classes**: `PascalCase` (e.g., `SparkOptimizer`)
- **Functions/Variables**: `camelCase` (e.g., `getOptimalConfig`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_EXECUTOR_MEMORY`)
- **Interfaces/Types**: `PascalCase` (e.g., `SparkConfig`)

### Code Formatting

We use Prettier for code formatting:

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

### Linting

We use ESLint with TypeScript:

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Testing Guidelines

### Test Structure

All tests should be located in appropriate directories:

```
src/
├── analyzers/
│   ├── workload.ts
│   └── workload.test.ts        # Unit tests next to source
tests/
├── integration/                # Integration tests
│   └── mcp-protocol.test.ts
└── benchmarks/                 # Performance tests
    └── performance.test.ts
```

### Writing Tests

```typescript
import { describe, it, expect } from '@jest/globals';
import { analyzeWorkload } from './workload';

describe('analyzeWorkload', () => {
  it('should correctly analyze ETL workload', () => {
    const workload = {
      type: 'etl' as const,
      dataSize: 1024 * 1024 * 1024 * 1024, // 1TB
      operations: ['read', 'transform', 'write'],
    };

    const result = analyzeWorkload(workload);

    expect(result.workloadType).toBe('io-intensive');
    expect(result.estimatedDuration).toBeGreaterThan(0);
  });

  it('should handle invalid input gracefully', () => {
    expect(() => analyzeWorkload(null as any)).toThrow('Invalid workload');
  });
});
```

### Test Coverage

- Aim for **80%+ code coverage**
- All new features must include tests
- Bug fixes should include regression tests

```bash
# Check coverage
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Mocked Hardware Testing

For development without GPU hardware:

```bash
# Set environment variable
export MOCK_HARDWARE=true
npm test

# Or inline
MOCK_HARDWARE=true npm test
```

## Submitting Changes

### Pull Request Guidelines

1. **Title**: Use conventional commit format
   - Example: `feat: add support for H100 GPUs`

2. **Description**: Include:
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
   - Any breaking changes
   - Related issue numbers (`Fixes #123`)

3. **Checklist**:
   - [ ] Tests pass (`npm test`)
   - [ ] Code is formatted (`npm run format`)
   - [ ] Linter passes (`npm run lint`)
   - [ ] Type checking passes (`npm run typecheck`)
   - [ ] Documentation is updated
   - [ ] Changelog is updated (for significant changes)

### Pull Request Template

```markdown
## Description

Brief description of the changes.

## Motivation

Why are these changes needed?

## Changes

- Change 1
- Change 2

## Testing

How were these changes tested?

## Breaking Changes

Are there any breaking changes? If yes, describe them.

## Related Issues

Fixes #123
Relates to #456

## Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] All tests pass
- [ ] Code formatted and linted
```

### Review Process

1. Automated checks must pass (CI/CD)
2. At least one maintainer approval required
3. Address review comments promptly
4. Keep PR scope focused and manageable
5. Be patient and respectful during review

## Documentation

### Code Documentation

Use JSDoc for all public APIs:

````typescript
/**
 * Analyzes a Spark workload and determines its characteristics.
 *
 * @param workload - The workload definition to analyze
 * @returns Analysis results including workload type and recommendations
 * @throws {Error} If workload definition is invalid
 *
 * @example
 * ```typescript
 * const analysis = analyzeWorkload({
 *   type: 'etl',
 *   dataSize: 1024 * 1024 * 1024 * 1024,
 *   operations: ['read', 'transform', 'write']
 * });
 * ```
 */
export function analyzeWorkload(workload: WorkloadDefinition): WorkloadAnalysis {
  // Implementation
}
````

### README and Guides

- Update README.md for user-facing changes
- Add guides to `docs/` for complex features
- Include code examples and use cases
- Keep documentation in sync with code

### Changelog

The `CHANGELOG.md` is **automatically generated** by semantic-release based on conventional commit messages. You don't need to manually update it.

When you use conventional commits, the changelog will be updated automatically during the release process:

- `feat:` commits → appear under "Features"
- `fix:` commits → appear under "Bug Fixes"
- `perf:` commits → appear under "Performance Improvements"
- `docs:` commits → appear under "Documentation"

See [docs/RELEASING.md](docs/RELEASING.md) for the complete release process.

## Community

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/raibid-labs/dgx-spark-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/raibid-labs/dgx-spark-mcp/discussions)
- **Documentation**: Check the `docs/` directory

### Asking Questions

Before asking a question:

1. Check existing issues and discussions
2. Review the documentation
3. Search the codebase for examples

When asking:

- Provide context and background
- Include relevant code snippets
- Describe what you've tried
- Specify your environment (OS, Node version, GPU model)

### Reporting Bugs

Use the bug report template and include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Error messages and logs
- Screenshots if applicable

### Requesting Features

Use the feature request template and include:

- Problem statement
- Proposed solution
- Alternative solutions considered
- Use cases and examples

## Development Tips

### Using the Justfile

```bash
# Show all available commands
just

# Pre-commit checks
just pre-commit

# Pre-push checks
just pre-push

# Run specific tests
just test-integration

# Build documentation
just docs-build
```

### Testing with Real Hardware

```bash
# Run with actual GPU detection
unset MOCK_HARDWARE
npm test

# Generate hardware report
just hardware-report
```

### Debugging

```bash
# Run with verbose logging
LOG_LEVEL=debug npm run dev

# Run specific test file
npm test -- src/analyzers/workload.test.ts

# Run tests in watch mode
npm run test:watch
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to the DGX Spark MCP Server! Your efforts help make this tool better for the entire community.
