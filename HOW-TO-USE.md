# How to Use the DGX-Spark MCP Server

## TL;DR - Quick Start

```bash
# 1. Fix TypeScript errors first (known issue - ~13 errors)
cd ~/raibid-labs/dgx-spark-mcp
npm run typecheck  # See what needs fixing

# 2. Install & build
npm install
npm run build

# 3. Configure Claude Code
# Add to ~/.config/Claude/claude_desktop_config.json:
{
  "mcpServers": {
    "dgx-spark": {
      "command": "node",
      "args": ["/home/beengud/raibid-labs/dgx-spark-mcp/dist/index.js"]
    }
  }
}

# 4. Restart Claude Code

# 5. Test it
# Ask Claude: "What GPUs do I have?"
```

## Current Status: Almost Ready

### ✅ Complete
- All 6 workstreams implemented
- 114 files, ~15,000 lines of code
- MCP protocol integration
- 12 resources + 5 tools

### ⚠️ Needs Fixing
- ~13 TypeScript compilation errors (type safety issues)
- Some modules need integration
- Needs testing on real DGX hardware

## Package.json Status

### ✅ Already Has MCP Best Practices
- ✅ `bin` field added (can be installed globally)
- ✅ `files` field (specifies what to publish)
- ✅ `repository` field (GitHub link)
- ✅ Proper metadata (keywords, description)
- ✅ Shebang in index.ts (#!/usr/bin/env node)

### Ready for Publishing (After Fixes)
```bash
# Once TypeScript errors are fixed:
npm publish --access public

# Install globally
npm install -g @dgx/spark-mcp

# Use anywhere
dgx-spark-mcp
```

## About dgx-spark-playbooks

**It's NOT the right place for this code.**

dgx-spark-playbooks is a collection of **tutorials/guides** like:
- "How to install Ollama on DGX Spark"
- "How to fine-tune with PyTorch"

Our MCP server is **actual software**, not a tutorial.

### What We COULD Contribute

A playbook/tutorial explaining how to **use** our MCP server:

**Title**: "Using Claude Code with DGX Spark via MCP"
**Path**: `nvidia/claude-code-mcp-integration/`
**Content**: Step-by-step guide to install and use our MCP server

This would be welcomed as it teaches users how to enhance their workflow.

## Next Steps

1. **Fix TypeScript errors** (use `npm run typecheck`)
2. **Test locally** (follow QUICKSTART.md)
3. **Test on real DGX** (if you have access)
4. **Publish to npm** (when stable)
5. **Maybe contribute playbook** to dgx-spark-playbooks

## Files to Read

- **QUICKSTART.md** - Detailed local testing guide
- **USAGE-GUIDE.md** - Complete usage documentation
- **PROJECT-COMPLETION-SUMMARY.md** - What was built
- **README.md** - Project overview

---

**Bottom Line**: The server is 95% done. Just needs TypeScript errors fixed, then you can test it locally with Claude Code!
