# Justfile Quick Reference

This project uses [just](https://just.systems/) for task automation. Think of it as a modern, improved version of `make`.

## Installation

```bash
# macOS
brew install just

# Linux
cargo install just

# Or download from https://github.com/casey/just/releases
```

## Quick Start

```bash
# List all available commands
just --list
just

# Run a command
just build
just test
just dev
```

## Common Workflows

### Development
```bash
just dev           # Start development server with hot reload
just build         # Build TypeScript
just test          # Run tests
just check         # Run all code quality checks
```

### Before Committing
```bash
just pre-commit    # Runs: check + test + build
```

### Before Pushing
```bash
just pre-push      # Runs: check + test:coverage + build + docker-build
```

### Docker Development
```bash
just docker-build        # Build Docker image
just docker-run          # Run in container
just docker-run-gpu      # Run with GPU support
just docker-shell        # Interactive shell
```

### Production Deployment
```bash
sudo just install        # Install as systemd service
just service-start       # Start the service
just service-status      # Check status
just service-logs        # View logs
```

### Maintenance
```bash
sudo just update         # Update to latest version
sudo just rollback       # Rollback to previous version
just health             # Check health endpoint
just metrics            # View Prometheus metrics
```

## All Commands by Category

### Build Commands
| Command | Description |
|---------|-------------|
| `just build` | Compile TypeScript |
| `just clean` | Remove build artifacts |
| `just rebuild` | Clean and rebuild |
| `just docs-build` | Build documentation index |

### Test Commands
| Command | Description |
|---------|-------------|
| `just test` | Run all tests |
| `just test-watch` | Watch mode testing |
| `just test-coverage` | Coverage reports |
| `just test-integration` | Integration tests only |
| `just test-mock` | Tests with mocked hardware |
| `just test-benchmark` | Performance benchmarks |

### Development
| Command | Description |
|---------|-------------|
| `just dev` | Hot-reload development server |
| `just start` | Production server |

### Code Quality
| Command | Description |
|---------|-------------|
| `just lint` | Run ESLint |
| `just lint-fix` | Auto-fix linting issues |
| `just format` | Format code with Prettier |
| `just format-check` | Check formatting |
| `just typecheck` | TypeScript type checking |
| `just check` | Run all checks |

### Docker
| Command | Description |
|---------|-------------|
| `just docker-build` | Build Docker image |
| `just docker-run` | Run container |
| `just docker-run-gpu` | Run with GPU support |
| `just docker-stop` | Stop container |
| `just docker-clean` | Remove image |
| `just docker-shell` | Interactive shell |

### Deployment
| Command | Description |
|---------|-------------|
| `just install` | Install systemd service |
| `just update` | Update to latest version |
| `just rollback` | Rollback to previous version |
| `just service-start` | Start service |
| `just service-stop` | Stop service |
| `just service-restart` | Restart service |
| `just service-status` | View service status |
| `just service-logs` | Follow service logs |
| `just service-enable` | Enable on boot |
| `just service-disable` | Disable on boot |

### Monitoring
| Command | Description |
|---------|-------------|
| `just health` | Check health endpoint |
| `just metrics` | Fetch Prometheus metrics |
| `just logs` | Tail application logs |
| `just logs-error` | Tail error logs |

### Utilities
| Command | Description |
|---------|-------------|
| `just validate-config` | Validate configuration |
| `just docs-search <query>` | Search documentation |
| `just hardware-report` | Generate hardware report |
| `just test-spark` | Test Spark intelligence |
| `just deps` | Install dependencies |
| `just deps-update` | Update dependencies |
| `just deps-outdated` | Check outdated deps |
| `just deps-audit` | Security audit |
| `just deps-audit-fix` | Fix vulnerabilities |

### Releases
| Command | Description |
|---------|-------------|
| `just release-patch` | Create patch release |
| `just release-minor` | Create minor release |
| `just release-major` | Create major release |

### CI/CD
| Command | Description |
|---------|-------------|
| `just ci-test` | Run CI tests locally |
| `just ci-build` | Run build workflow locally |
| `just ci-verify` | Verify all workflows |

### Complete Workflows
| Command | Description |
|---------|-------------|
| `just pre-commit` | Full pre-commit check |
| `just pre-push` | Full pre-push check |
| `just pre-release` | Release preparation |

## Examples

### Typical Development Session
```bash
# Start development server
just dev

# In another terminal, run tests in watch mode
just test-watch

# Make changes, then check before committing
just pre-commit

# If all passes, commit and push
git add .
git commit -m "feat: add new feature"
just pre-push
git push
```

### Production Deployment
```bash
# First-time installation
sudo just install

# Check if running
just service-status

# View real-time logs
just service-logs

# Update to new version
sudo just update

# If issues occur
sudo just rollback
```

### Docker Workflow
```bash
# Build image
just docker-build

# Test locally
just docker-run

# Enter container for debugging
just docker-shell

# With GPU support (requires nvidia-docker)
just docker-run-gpu
```

### Monitoring
```bash
# Check if service is healthy
just health

# View Prometheus metrics
just metrics

# Check application logs
just logs

# Check error logs only
just logs-error
```

## Tips

1. **Tab Completion**: Many shells support tab completion for `just` commands
2. **Help**: Run `just` or `just --list` to see all commands
3. **Chaining**: You can chain commands: `just clean build test`
4. **Dry Run**: Use `just --dry-run <command>` to see what would be executed
5. **Verbose**: Use `just --verbose <command>` to see command output

## Why Just?

- **Simpler than Make**: No weird syntax quirks
- **Cross-platform**: Works on Linux, macOS, Windows
- **Fast**: Written in Rust
- **Developer-friendly**: Better error messages
- **Modern**: Built for today's development workflows

## Getting Started

If you're new to the project, run these commands in order:

```bash
# 1. Install dependencies
just deps

# 2. Build the project
just build

# 3. Run tests to verify everything works
just test

# 4. Start development server
just dev
```

## Advanced Usage

### Custom Commands with Parameters

```bash
# Search documentation
just docs-search "GPU optimization"

# You can add your own commands in the justfile!
```

### Environment Variables

```bash
# Run tests with mocked hardware
MOCK_HARDWARE=true just test

# Or use the shortcut
just test-mock
```

## Troubleshooting

### "just: command not found"
Install just using the instructions at the top of this document.

### "Permission denied"
Some commands require sudo:
```bash
sudo just install
sudo just update
sudo just rollback
```

### "Service commands not working"
Make sure the service is installed:
```bash
sudo just install
```

## More Information

- **Just Documentation**: https://just.systems/
- **Project Documentation**: See `/home/beengud/raibid-labs/dgx-spark-mcp/docs/`
- **DevOps Guide**: See `WS6-DEVOPS-COMPLETION-REPORT.md`

---

*Quick tip: Add `alias j=just` to your shell rc file for even faster commands!*
