# DGX-Spark MCP Server - Quick Start Guide

## Local Testing (Before Publishing)

### Prerequisites

- **Node.js**: 20+ (check with `node --version`)
- **System**: Linux (tested on Ubuntu 22.04)
- **Hardware**: NVIDIA GPU with nvidia-smi in PATH (or will use mocks)

### Step 1: Install Dependencies

```bash
cd ~/raibid-labs/dgx-spark-mcp
npm install
```

### Step 2: Build the Project

```bash
# Fix TypeScript errors first (see below)
npm run build
```

**Note**: Currently has TypeScript errors that need fixing. See "Known Issues" below.

### Step 3: Test Locally

#### Option A: Test with MCP Inspector (Recommended)

```bash
# Install MCP Inspector
npx @modelcontextprotocol/inspector dist/index.js
```

This opens a web UI where you can:
- List available resources
- Call tools with test inputs
- View responses

#### Option B: Test with Direct JSON-RPC

```bash
# List resources
echo '{"jsonrpc":"2.0","id":1,"method":"resources/list"}' | node dist/index.js

# Check GPU availability
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"check_gpu_availability"}}' | node dist/index.js

# Get Spark config
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_optimal_spark_config","arguments":{"workloadType":"ml-training","dataSize":"1TB"}}}' | node dist/index.js
```

### Step 4: Configure Claude Code

Add to your Claude Code MCP settings (`~/.config/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "dgx-spark": {
      "command": "node",
      "args": ["/home/beengud/raibid-labs/dgx-spark-mcp/dist/index.js"],
      "env": {
        "DGX_MCP_LOG_LEVEL": "info"
      }
    }
  }
}
```

### Step 5: Restart Claude Code

Restart Claude Code to load the MCP server.

### Step 6: Test in Claude Code

Try these queries:
- "What GPUs are available on my DGX system?"
- "Generate an optimal Spark configuration for a 1TB ML training job"
- "Search the DGX Spark documentation for GPU memory optimization"
- "What's my current system health?"

## Known Issues (Need Fixing Before Testing)

### TypeScript Compilation Errors

Currently ~13 TypeScript errors need fixing:

1. **Type mismatches in tools** (src/tools/spark-config.ts)
2. **Undefined handling** (src/types/spark.ts, src/validators/)
3. **Unused imports** (src/types/estimation.ts)

**To Fix**: See "Development Fixes Needed" section below.

## Development Fixes Needed

### Fix 1: Update package.json for MCP Publishing

Add these fields:

```json
{
  "bin": {
    "dgx-spark-mcp": "./dist/index.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/raibid-labs/dgx-spark-mcp.git"
  }
}
```

### Fix 2: Add Shebang to index.ts

Add to top of `src/index.ts`:

```typescript
#!/usr/bin/env node
```

### Fix 3: Fix TypeScript Errors

Run and fix each error:
```bash
npm run typecheck
```

## Testing Without Hardware

The server includes complete hardware mocks for CI/CD:

```bash
# Use mock hardware
MOCK_HARDWARE=true npm run dev
```

This simulates:
- 4x NVIDIA A100-SXM4-80GB GPUs
- AMD EPYC 7742 (64 cores)
- 1TB RAM
- 3.5TB NVMe storage
- InfiniBand network

## Development Workflow

```bash
# Development server (hot reload)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint and format
npm run lint:fix
npm run format

# Full validation
just pre-commit  # requires 'just' installed
```

## Publishing Checklist (For Later)

When ready to publish to npm:

- [ ] Fix all TypeScript errors
- [ ] Add bin field to package.json
- [ ] Add shebang to index.ts
- [ ] Run full test suite (npm test)
- [ ] Test with MCP Inspector
- [ ] Test in Claude Code locally
- [ ] Update version in package.json
- [ ] Create git tag
- [ ] Publish to npm (`npm publish --access public`)
- [ ] Add to MCP servers registry (https://github.com/modelcontextprotocol/servers)

## Troubleshooting

### "nvidia-smi: command not found"

If you don't have an NVIDIA GPU:
```bash
MOCK_HARDWARE=true npm run dev
```

### "Module not found" errors

Rebuild:
```bash
npm run clean
npm run build
```

### MCP Inspector not connecting

Check the server is running:
```bash
node dist/index.js
# Should show: DGX-Spark MCP Server ready on stdio
```

## Next Steps After Testing

1. **Gather Feedback**: Use it with Claude Code for real tasks
2. **Fix Issues**: Document any bugs or missing features
3. **Optimize**: Profile performance on real DGX hardware
4. **Iterate**: Improve based on usage patterns
5. **Publish**: Once stable, publish to npm and MCP registry

## Support

- **Issues**: https://github.com/raibid-labs/dgx-spark-mcp/issues
- **Documentation**: See docs/ directory
- **Tests**: See tests/ directory for usage examples
