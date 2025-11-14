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

```bash
# Install
npm install -g dgx-spark-mcp

# Configure Claude Code
# Add to your MCP settings:
{
  "mcpServers": {
    "dgx-spark": {
      "command": "dgx-spark-mcp"
    }
  }
}

# Use in Claude Code
# "What GPUs are available right now?"
# "Generate optimal Spark config for 1TB ETL job"
# "How should I configure executors for ML training?"
```

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

This project uses parallel workstreams for rapid development:

| Workstream | Status | Agent | Issue |
|------------|--------|-------|-------|
| WS1: MCP Server Foundation | 🟡 Not Started | backend-architect | [#1](https://github.com/raibid-labs/dgx-spark-mcp/issues/1) |
| WS2: Hardware Detection | 🟡 Not Started | infrastructure-maintainer | [#2](https://github.com/raibid-labs/dgx-spark-mcp/issues/2) |
| WS3: MCP Resources & Tools | 🟡 Not Started | ai-engineer | [#3](https://github.com/raibid-labs/dgx-spark-mcp/issues/3) |
| WS4: Documentation System | 🟡 Not Started | frontend-developer | [#4](https://github.com/raibid-labs/dgx-spark-mcp/issues/4) |
| WS5: DGX Spark Intelligence | 🟡 Not Started | ai-engineer | [#5](https://github.com/raibid-labs/dgx-spark-mcp/issues/5) |
| WS6: Testing & DevOps | 🟡 Not Started | test-writer-fixer | [#6](https://github.com/raibid-labs/dgx-spark-mcp/issues/6) |

See [Agent Coordination Guide](docs/agents/coordination.md) for multi-agent development patterns.

### Local Development

```bash
# Clone repository
git clone https://github.com/raibid-labs/dgx-spark-mcp.git
cd dgx-spark-mcp

# Install dependencies
npm install

# Run development server
npm run dev

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

🏗️ **Active Development**

Currently implementing foundation workstreams (WS1, WS2, WS4) in parallel.

---

**Next Steps**: See workstream issues for detailed implementation plans.