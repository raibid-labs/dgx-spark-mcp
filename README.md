# DGX-Spark MCP Server

> **Persistent hardware context and intelligent Spark optimization for Claude Code on NVIDIA DGX systems**

[![CI](https://github.com/raibid-labs/dgx-spark-mcp/workflows/test/badge.svg)](https://github.com/raibid-labs/dgx-spark-mcp/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Problem

Claude Code forgets your DGX hardware specifications between sessions. This leads to:
- ❌ Asking about GPU count/specs repeatedly
- ❌ Generating sub-optimal Spark configurations
- ❌ Missing DGX-specific optimization opportunities
- ❌ No real-time GPU availability awareness

## Solution

An MCP (Model Context Protocol) server that provides:
- ✅ **Persistent Hardware Context**: Always knows your DGX specs
- ✅ **Real-Time GPU Status**: Check availability before suggesting jobs
- ✅ **Intelligent Spark Configs**: Generate optimal configs for your hardware
- ✅ **DGX Documentation**: Instant access to DGX Spark best practices
- ✅ **Resource Estimation**: Predict job requirements accurately

## Quick Start

This MCP server is designed to be used as part of the [raibid-labs/workspace](https://github.com/raibid-labs/workspace).

### Installation via Workspace

```bash
# Clone the workspace (includes this MCP server as a submodule)
git clone --recursive https://github.com/raibid-labs/workspace.git
cd workspace

# Follow workspace setup instructions
# The DGX Spark MCP server will be automatically configured
```

### Standalone Installation (Advanced)

If you need to install this MCP server independently:

```bash
# Clone and build
git clone https://github.com/raibid-labs/dgx-spark-mcp.git
cd dgx-spark-mcp
npm install
npm run build

# Add to your Claude Code MCP settings:
{
  "mcpServers": {
    "dgx-spark": {
      "command": "node",
      "args": ["/path/to/dgx-spark-mcp/dist/index.js"]
    }
  }
}
```

### Usage in Claude Code

Once configured via workspace, you can ask Claude:
- "What GPUs are available right now?"
- "Generate optimal Spark config for 1TB ETL job"
- "How should I configure executors for ML training?"
- "Search DGX documentation for best practices"

## Features

### MCP Resources (Static Context)
Claude Code can read these at any time:

- **`dgx://hardware/specs`** - Complete hardware specifications
- **`dgx://hardware/topology`** - GPU interconnect and system topology
- **`dgx://system/capabilities`** - What your system can do
- **`dgx://docs/spark/{topic}`** - DGX Spark documentation

### MCP Tools (Dynamic Operations)
Claude Code can invoke these tools:

- **`check_gpu_availability`** - Current GPU utilization and availability
- **`get_optimal_spark_config`** - Generate Spark config for workload
- **`search_documentation`** - Search DGX Spark docs
- **`estimate_resources`** - Estimate job resource requirements
- **`get_system_health`** - Current system health status

## Architecture

```
Claude Code ←→ MCP Protocol ←→ DGX-Spark MCP Server
                                      ↓
                         ┌────────────┼────────────┐
                         ↓            ↓            ↓
                  Hardware Detection  Intelligence  Documentation
                  (nvidia-smi, /proc) (Spark Optimizer) (Search & Index)
                         ↓
                   DGX Hardware
```

See [Architecture Overview](docs/architecture/overview.md) for details.

## Development

This project was developed using parallel workstreams:

| Workstream | Status | Description |
|------------|--------|-------------|
| WS1: MCP Server Foundation | ✅ Complete | Core MCP protocol implementation |
| WS2: Hardware Detection | ✅ Complete | GPU and system introspection |
| WS3: MCP Resources & Tools | ✅ Complete | Resource and tool integration |
| WS4: Documentation System | ✅ Complete | Searchable docs with indexing |
| WS5: DGX Spark Intelligence | ✅ Complete | Workload analysis and optimization |
| WS6: Testing & DevOps | ✅ Complete | Comprehensive test suite and CI/CD |

See completion reports in `docs/workstreams/` for detailed implementation notes.

### Local Development

#### Within Workspace (Recommended)

```bash
# Navigate to workspace
cd workspace/dgx-spark-mcp

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Use justfile for common tasks
just build    # Build the project
just test     # Run tests
just lint     # Run linting
```

#### Standalone Development

```bash
# Clone repository
git clone https://github.com/raibid-labs/dgx-spark-mcp.git
cd dgx-spark-mcp

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [Agent Coordination](docs/agents/coordination.md)
- [Workstream Details](docs/workstreams/)
- [API Documentation](docs/api/) _(coming soon)_

## Requirements

- **Node.js**: 20+
- **NVIDIA Drivers**: Latest
- **nvidia-smi**: Must be in PATH
- **Operating System**: Linux (tested on Ubuntu 22.04)
- **Hardware**: NVIDIA DGX or compatible system

## Contributing

This project uses multi-agent parallel development. See:
- [Agent Coordination Guide](docs/agents/coordination.md)
- [Development Workflow](docs/development.md) _(coming soon)_

## License

MIT License - see [LICENSE](LICENSE) file

## Project Status

✅ **Production Ready**

All core workstreams completed:
- ✅ WS1: MCP Server Foundation
- ✅ WS2: Hardware Detection System
- ✅ WS3: MCP Resources & Tools Integration
- ✅ WS4: Documentation System
- ✅ WS5: DGX Spark Intelligence Engine
- ✅ WS6: Testing & DevOps Infrastructure

---

**Part of**: [raibid-labs/workspace](https://github.com/raibid-labs/workspace) - An integrated development environment for DGX systems