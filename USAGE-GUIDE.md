# DGX-Spark MCP Server - Usage Guide

## Current Status

### ✅ What's Done
- Complete MCP server implementation (6 workstreams)
- 12 MCP Resources + 5 MCP Tools
- Comprehensive documentation system
- Hardware detection layer
- Spark intelligence engine
- Testing infrastructure (137 tests)
- DevOps automation (CI/CD, Docker)

### ⚠️ What Needs Fixing Before Use
1. **TypeScript compilation errors** (~13 errors, mostly type safety issues)
2. **Missing module implementations** (35 test cases pending)
3. **Integration testing** needed on real DGX hardware

## Quick Start for Local Testing

### 1. Install & Build

```bash
cd ~/raibid-labs/dgx-spark-mcp

# Install dependencies
npm install

# Build (will show errors - that's expected)
npm run build
```

**Expected**: TypeScript errors. The server agents implemented most code but some type issues remain.

### 2. Fix TypeScript Errors (Required)

The main errors are in:
- `src/tools/spark-config.ts` - Type mismatches
- `src/types/spark.ts` - Undefined handling
- `src/validators/*.ts` - Undefined checks

Quick fix approach:
```bash
# See all errors
npm run typecheck

# Fix them iteratively
# Most are simple: add "?" for optional types, handle undefined cases
```

### 3. Test Without Claude Code

Once built successfully:

```bash
# Test MCP protocol
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node dist/index.js

# Should respond with server capabilities
```

### 4. Configure Claude Code

**File**: `~/.config/Claude/claude_desktop_config.json` (macOS/Linux)
**File**: `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "dgx-spark": {
      "command": "node",
      "args": ["/home/beengud/raibid-labs/dgx-spark-mcp/dist/index.js"],
      "env": {
        "DGX_MCP_LOG_LEVEL": "debug",
        "DGX_MCP_HARDWARE_CACHE_TTL": "60"
      }
    }
  }
}
```

### 5. Test in Claude Code

After restarting Claude Code, try:

```
You: "What GPUs do I have?"
Claude: [Reads dgx://hardware/gpus resource]

You: "Generate a Spark config for 1TB ML training"
Claude: [Calls get_optimal_spark_config tool]

You: "Search docs for GPU optimization"
Claude: [Calls search_documentation tool]
```

## Using the Tools & Resources

### MCP Resources (Claude can read these)

```typescript
// Hardware Specifications
dgx://hardware/specs        // Complete system specs
dgx://hardware/topology     // GPU interconnect topology
dgx://hardware/gpus         // GPU details
dgx://hardware/cpu          // CPU info
dgx://hardware/memory       // Memory specs
dgx://hardware/storage      // Storage devices
dgx://hardware/network      // Network interfaces

// System Intelligence
dgx://system/capabilities   // What the system can do

// Documentation
dgx://docs/list                    // All docs
dgx://docs/search?q=query          // Search
dgx://docs/spark/installation      // Specific doc
```

### MCP Tools (Claude can call these)

**1. Check GPU Availability**
```json
{
  "name": "check_gpu_availability",
  "arguments": {}
}
```
Returns: Current GPU utilization, available GPUs, recommendations

**2. Get Optimal Spark Config**
```json
{
  "name": "get_optimal_spark_config",
  "arguments": {
    "workloadType": "ml-training",  // ml-training, etl, analytics, sql, streaming, graph
    "dataSize": "1TB",
    "gpuCount": 4  // optional
  }
}
```
Returns: Complete Spark configuration with tuning

**3. Search Documentation**
```json
{
  "name": "search_documentation",
  "arguments": {
    "query": "GPU memory optimization",
    "limit": 5  // optional
  }
}
```
Returns: Ranked search results

**4. Estimate Resources**
```json
{
  "name": "estimate_resources",
  "arguments": {
    "description": "Process 10TB of logs with 1000 transformations"
  }
}
```
Returns: Memory, CPU, GPU, time estimates

**5. Get System Health**
```json
{
  "name": "get_system_health",
  "arguments": {}
}
```
Returns: Component health, warnings, errors

## Development Commands

```bash
# Development server (hot reload)
npm run dev
# or
just dev

# Run tests
npm test

# Run specific test
npm test -- src/config/schema.test.ts

# Check types
npm run typecheck

# Lint & format
npm run lint:fix
npm run format

# Build documentation index
npm run docs:build

# Clean build
npm run clean && npm run build
```

## Monitoring & Debugging

### Logs

```bash
# If running as systemd service
journalctl -u dgx-spark-mcp -f

# If running in dev mode
# Logs to console with Winston formatting
```

### Metrics

```bash
# Prometheus metrics endpoint
curl http://localhost:3000/metrics

# Health check
curl http://localhost:3000/health
```

### Debug Mode

```bash
# Enable debug logging
DGX_MCP_LOG_LEVEL=debug npm run dev

# Or in Claude Code config
{
  "env": {
    "DGX_MCP_LOG_LEVEL": "debug"
  }
}
```

## Testing Without Real Hardware

Use mock mode for development/CI:

```bash
MOCK_HARDWARE=true npm run dev
```

This simulates:
- **4x NVIDIA A100-SXM4-80GB** (80GB VRAM each, NVLink enabled)
- **AMD EPYC 7742** (64 cores, 128 threads)
- **1TB DDR4 RAM**
- **3.5TB NVMe Storage**
- **100Gbps Ethernet + 200Gbps InfiniBand**

## Configuration

All config via environment variables (see `.env.example`):

```bash
# Server
DGX_MCP_SERVER_NAME=dgx-spark
DGX_MCP_SERVER_VERSION=0.1.0

# Logging
DGX_MCP_LOG_LEVEL=info         # debug, info, warn, error
DGX_MCP_LOG_FORMAT=json        # json, simple, pretty

# Hardware Detection
DGX_MCP_HARDWARE_CACHE_TTL=60  # seconds
DGX_MCP_MOCK_HARDWARE=false    # true for CI/testing

# Spark Optimization
DGX_MCP_SPARK_DEFAULT_EXECUTOR_MEMORY=8g
DGX_MCP_SPARK_DEFAULT_EXECUTOR_CORES=4

# Documentation
DGX_MCP_DOCS_INDEX_PATH=./data/docs-index.json
DGX_MCP_DOCS_CACHE_TTL=86400   # 24 hours
```

## Publishing (Future)

### Before Publishing to npm:

1. **Fix all TypeScript errors**
   ```bash
   npm run typecheck  # Should show 0 errors
   ```

2. **Run full test suite**
   ```bash
   npm test  # Should be 100+ passing
   ```

3. **Test with MCP Inspector**
   ```bash
   npx @modelcontextprotocol/inspector dist/index.js
   ```

4. **Version bump**
   ```bash
   npm version patch  # or minor, major
   ```

5. **Publish**
   ```bash
   npm publish --access public
   ```

6. **Submit to MCP Registry**
   - Fork: https://github.com/modelcontextprotocol/servers
   - Add to `src/servers.json`:
   ```json
   {
     "dgx-spark": {
       "name": "DGX-Spark MCP Server",
       "description": "Hardware introspection and Spark optimization for NVIDIA DGX systems",
       "repository": "https://github.com/raibid-labs/dgx-spark-mcp",
       "keywords": ["dgx", "spark", "nvidia", "gpu", "optimization"]
     }
   }
   ```

## Contributing to dgx-spark-playbooks

The dgx-spark-playbooks repo is for **tutorials**, not code. But we could contribute:

**Playbook Idea**: "Using the DGX-Spark MCP Server with Claude Code"

Structure:
```markdown
# Using the DGX-Spark MCP Server with Claude Code

## Overview
Enable Claude Code to remember your DGX hardware...

## Prerequisites
- NVIDIA DGX Spark or compatible system
- Claude Code installed
- Node.js 20+

## Step 1: Install the MCP Server
...

## Step 2: Configure Claude Code
...

## Step 3: Example Use Cases
...

## Troubleshooting
...
```

This would fit perfectly in `nvidia/dgx-spark-mcp-claude/` as a playbook.

## Support & Issues

- **GitHub Issues**: https://github.com/raibid-labs/dgx-spark-mcp/issues
- **Documentation**: See `docs/` directory
- **Examples**: See `tests/` for usage examples
- **CI/CD**: See `.github/workflows/` for automation

## Next Steps

1. **Fix TypeScript errors** (highest priority)
2. **Test on real DGX hardware**
3. **Iterate based on real usage**
4. **Consider dgx-spark-playbooks contribution** (tutorial/guide)
5. **Publish to npm** (when stable)
6. **Submit to MCP registry** (when published)
