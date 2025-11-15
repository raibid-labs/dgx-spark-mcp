# DGX Spark MCP Server

<div align="center">

[![CI](https://github.com/raibid-labs/dgx-spark-mcp/workflows/test/badge.svg)](https://github.com/raibid-labs/dgx-spark-mcp/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

**Hardware-aware Spark optimization for NVIDIA DGX systems via Model Context Protocol**

[Features](#features) •
[Installation](#installation) •
[Configuration](#configuration) •
[Usage](#usage) •
[Documentation](#documentation) •
[Contributing](#contributing)

</div>

---

## Overview

DGX Spark MCP Server is a [Model Context Protocol](https://modelcontextprotocol.io) server that provides Claude with persistent context about your NVIDIA DGX hardware and intelligent Apache Spark optimization capabilities. Instead of repeatedly describing your GPU configuration, Claude automatically knows your hardware specs and can generate optimal Spark configurations for your workloads.

### The Problem

When working with Claude on Spark optimization:

- ❌ You must repeatedly describe your DGX hardware configuration
- ❌ Claude cannot check real-time GPU availability
- ❌ Generated Spark configs may not be optimal for your specific hardware
- ❌ No access to DGX-specific best practices and tuning guides

### The Solution

An MCP server that gives Claude:

- ✅ **Persistent Hardware Context** - Automatic detection and caching of DGX specs
- ✅ **Real-Time GPU Monitoring** - Live availability and utilization data via `nvidia-smi`
- ✅ **Intelligent Spark Optimization** - Generate optimal configs based on workload analysis
- ✅ **Documentation Access** - Searchable knowledge base of DGX Spark best practices
- ✅ **Resource Estimation** - Predict job requirements before execution

## Features

### MCP Resources

Static context that Claude can read at any time:

| Resource                    | Description                                               |
| --------------------------- | --------------------------------------------------------- |
| `dgx://hardware/specs`      | Complete DGX hardware specifications (GPUs, memory, CPUs) |
| `dgx://hardware/topology`   | GPU interconnect topology and NVLink configuration        |
| `dgx://system/capabilities` | System capabilities and supported features                |
| `dgx://docs/spark/{topic}`  | DGX Spark documentation and best practices                |

### MCP Tools

Dynamic operations that Claude can invoke:

| Tool                       | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| `check_gpu_availability`   | Query current GPU utilization and availability            |
| `get_optimal_spark_config` | Generate Spark config optimized for workload and hardware |
| `search_documentation`     | Search DGX Spark documentation                            |
| `estimate_resources`       | Estimate resource requirements for a workload             |
| `get_system_health`        | Check system health and status                            |
| `validate_spark_config`    | Validate Spark configuration against best practices       |

## Installation

### Prerequisites

- **Node.js** 18.0.0 or higher
- **NVIDIA GPU Drivers** and `nvidia-smi` in PATH
- **Operating System**: Linux (tested on Ubuntu 22.04)
- **Hardware**: NVIDIA DGX or compatible GPU system

### Option 1: Install from npm (Recommended)

```bash
npm install -g dgx-spark-mcp
```

### Option 2: Install from Source

```bash
# Clone the repository
git clone https://github.com/raibid-labs/dgx-spark-mcp.git
cd dgx-spark-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Optionally link globally
npm link
```

### Option 3: Run with npx

```bash
npx dgx-spark-mcp
```

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dgx-spark": {
      "command": "dgx-spark-mcp"
    }
  }
}
```

**Configuration file locations:**

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Claude Code (CLI)

Add to your MCP settings configuration:

```json
{
  "mcpServers": {
    "dgx-spark": {
      "command": "dgx-spark-mcp"
    }
  }
}
```

### Advanced Configuration

Create a `config/local.json` file to customize server behavior:

```json
{
  "mcp": {
    "serverName": "dgx-spark-mcp",
    "serverVersion": "0.1.0"
  },
  "logging": {
    "level": "info",
    "enableConsole": true,
    "enableFile": true
  },
  "hardware": {
    "cacheDuration": 3600000,
    "enableGPUMonitoring": true
  },
  "docs": {
    "indexPath": "docs/index.json",
    "autoRebuild": true
  }
}
```

See [docs/configuration.md](docs/configuration.md) for all configuration options.

## Usage

Once configured, Claude will automatically have access to your DGX hardware context. You can ask questions like:

### Hardware Queries

```
"What GPUs do I have available?"
"Show me the current GPU utilization"
"What's the NVLink topology of my system?"
```

### Spark Optimization

```
"Generate optimal Spark config for a 1TB ETL job"
"How should I configure executors for ML training on 8 A100 GPUs?"
"What's the best memory configuration for my hardware?"
```

### Documentation Search

```
"Search documentation for GPU memory tuning"
"What are the best practices for shuffle operations on DGX?"
"Show me examples of Spark Rapids configuration"
```

### Resource Planning

```
"Estimate resources needed for processing 5TB of Parquet files"
"Can I run 4 concurrent jobs with my current hardware?"
"What's the optimal partition size for my dataset?"
```

## Architecture

```
┌─────────────────┐
│  Claude Desktop │
│   or CLI        │
└────────┬────────┘
         │ MCP Protocol (stdio)
         ▼
┌─────────────────────────────────────┐
│     DGX Spark MCP Server            │
├─────────────────────────────────────┤
│  ┌──────────┐  ┌────────────────┐  │
│  │Resources │  │     Tools      │  │
│  │  Layer   │  │    Layer       │  │
│  └────┬─────┘  └────────┬───────┘  │
│       │                 │           │
│  ┌────▼─────────────────▼────────┐ │
│  │   Intelligence Engine          │ │
│  ├────────────────────────────────┤ │
│  │  • Workload Analyzer           │ │
│  │  • Config Generator            │ │
│  │  • Resource Estimator          │ │
│  │  • Best Practices Validator    │ │
│  └────────────┬───────────────────┘ │
│               │                     │
│  ┌────────────▼───────────────────┐ │
│  │   Hardware Detection Layer     │ │
│  ├────────────────────────────────┤ │
│  │  • nvidia-smi Integration      │ │
│  │  • /proc filesystem parsing    │ │
│  │  • Topology detection          │ │
│  └────────────┬───────────────────┘ │
└───────────────┼─────────────────────┘
                │
         ┌──────▼───────┐
         │ DGX Hardware │
         └──────────────┘
```

For detailed architecture information, see [docs/architecture/overview.md](docs/architecture/overview.md).

## Development

### Quick Start

```bash
# Clone and install
git clone https://github.com/raibid-labs/dgx-spark-mcp.git
cd dgx-spark-mcp
npm install

# Run tests
npm test

# Build
npm run build

# Run in development mode with hot reload
npm run dev
```

### Using the Justfile

This project includes a comprehensive [justfile](https://just.systems/) for development tasks:

```bash
# Show all available commands
just

# Development workflow
just build          # Build TypeScript
just test           # Run tests
just test-coverage  # Run tests with coverage
just lint           # Run linter
just format         # Format code

# Quality checks
just check          # Run all quality checks (lint, format-check, typecheck)
just pre-commit     # Full pre-commit validation
just pre-push       # Full pre-push validation

# Docker
just docker-build   # Build Docker image
just docker-run-gpu # Run with GPU support

# Documentation
just docs-build     # Build documentation index
just docs-search "query" # Search documentation
```

See [JUSTFILE-REFERENCE.md](JUSTFILE-REFERENCE.md) for all available commands.

### Project Structure

```
dgx-spark-mcp/
├── src/
│   ├── server.ts           # MCP server implementation
│   ├── hardware/           # Hardware detection
│   ├── analyzers/          # Workload analysis
│   ├── optimizers/         # Spark optimization
│   ├── estimators/         # Resource estimation
│   ├── validators/         # Config validation
│   ├── resources/          # MCP resources
│   ├── tools/              # MCP tools
│   └── docs/               # Documentation system
├── tests/
│   ├── integration/        # Integration tests
│   └── benchmarks/         # Performance tests
├── docs/                   # Documentation
├── config/                 # Configuration files
└── scripts/                # Utility scripts
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run with mocked hardware (for development without GPU)
MOCK_HARDWARE=true npm test
```

### Code Quality

```bash
# Lint TypeScript files
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting
npm run format:check

# Type checking
npm run typecheck
```

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[Architecture Overview](docs/architecture/overview.md)** - System design and components
- **[Hardware Detection](docs/hardware-detection-api.md)** - GPU detection and monitoring
- **[Spark Configuration](docs/spark/configuration.md)** - Spark optimization guide
- **[Best Practices](docs/spark/best-practices.md)** - DGX Spark recommendations
- **[API Documentation](docs/api/)** - Detailed API reference
- **[Development Guide](docs/development.md)** - Contributing guidelines

## Contributing

We welcome contributions! This project is designed to eventually be contributed to the [dgx-spark-playbooks](https://github.com/NVIDIA/dgx-spark-playbooks) ecosystem.

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run quality checks: `just check`
6. Commit using conventional commits: `git commit -m 'feat: add your feature'`
7. Push to the branch: `git push origin feature/your-feature`
8. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation:

```bash
# Feature (minor version bump)
git commit -m "feat: add GPU topology detection"

# Bug fix (patch version bump)
git commit -m "fix: correct memory calculation"

# Breaking change (major version bump)
git commit -m "feat!: change resource API interface"

# Other types (no version bump)
git commit -m "docs: update README"
git commit -m "chore: update dependencies"
git commit -m "test: add integration tests"
```

See [docs/RELEASING.md](docs/RELEASING.md) for the complete release process.

### Development Workflow

This project follows a multi-workstream development approach:

| Workstream                  | Status      | Description                        |
| --------------------------- | ----------- | ---------------------------------- |
| WS1: MCP Server Foundation  | ✅ Complete | Core MCP protocol implementation   |
| WS2: Hardware Detection     | ✅ Complete | GPU and system introspection       |
| WS3: MCP Resources & Tools  | ✅ Complete | Resource and tool integration      |
| WS4: Documentation System   | ✅ Complete | Searchable docs with indexing      |
| WS5: DGX Spark Intelligence | ✅ Complete | Workload analysis and optimization |
| WS6: Testing & DevOps       | ✅ Complete | Comprehensive test suite and CI/CD |

## Roadmap

- [ ] Support for additional GPU architectures (H100, Grace Hopper)
- [ ] Integration with NVIDIA Rapids for GPU-accelerated Spark
- [ ] Historical performance metrics and trend analysis
- [ ] Auto-tuning based on job execution history
- [ ] Multi-node DGX cluster support
- [ ] Kubernetes integration for containerized Spark
- [ ] Integration with dgx-spark-playbooks

## Troubleshooting

### Common Issues

**nvidia-smi not found**

```bash
# Ensure NVIDIA drivers are installed and nvidia-smi is in PATH
which nvidia-smi
nvidia-smi
```

**Permission denied accessing GPU information**

```bash
# Add user to video group (Linux)
sudo usermod -a -G video $USER
# Log out and back in
```

**Module not found errors after installation**

```bash
# Rebuild the project
npm run clean
npm install
npm run build
```

See [docs/spark/troubleshooting.md](docs/spark/troubleshooting.md) for more solutions.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Inspired by [NVIDIA DGX Spark Playbooks](https://github.com/NVIDIA/dgx-spark-playbooks)
- Hardware detection powered by `nvidia-smi` and Linux `/proc` filesystem

## Support

- **Issues**: [GitHub Issues](https://github.com/raibid-labs/dgx-spark-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/raibid-labs/dgx-spark-mcp/discussions)
- **Documentation**: [docs/](docs/)

---

<div align="center">

**Built with ❤️ for the DGX and Spark community**

</div>
