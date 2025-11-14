# Agent Coordination Guide - DGX-Spark MCP Server

## Overview

This guide defines coordination patterns for multi-agent development of the DGX-Spark MCP server. Based on raibid-labs MOP patterns, this enables parallel workstreams with hook-based coordination and clear ownership boundaries.

## Core Coordination Principles

### 1. Directory Ownership Model

Each agent or team owns specific directories and files, preventing conflicts during parallel execution:

```
Backend Team:
├── src/server.ts                    # Server core (backend-architect)
├── src/config/                      # Configuration system (backend-architect)
├── src/lifecycle/                   # Lifecycle management (backend-architect)
├── src/logger/                      # Logging system (backend-architect)
└── src/errors/                      # Error handling (backend-architect)

Hardware Team:
├── src/hardware/gpu.ts              # GPU detection (infrastructure-maintainer)
├── src/hardware/cpu.ts              # CPU detection (infrastructure-maintainer)
├── src/hardware/memory.ts           # Memory detection (infrastructure-maintainer)
├── src/hardware/storage.ts          # Storage detection (infrastructure-maintainer)
├── src/hardware/network.ts          # Network detection (infrastructure-maintainer)
└── src/hardware/topology.ts         # Topology orchestrator (infrastructure-maintainer)

MCP Integration Team:
├── src/resources/                   # MCP resources (ai-engineer)
├── src/tools/                       # MCP tools (ai-engineer)
└── src/types/mcp.ts                 # MCP types (ai-engineer)

Documentation Team:
├── src/docs/                        # Doc system (frontend-developer)
├── docs/spark/                      # Spark documentation (frontend-developer)
└── docs/architecture/               # Architecture docs (backend-architect)

Intelligence Team:
├── src/optimizers/                  # Spark optimizers (ai-engineer)
├── src/analyzers/                   # Workload analyzers (ai-engineer)
├── src/estimators/                  # Resource estimators (ai-engineer)
├── src/models/                      # Performance models (ai-engineer)
├── src/validators/                  # Config validators (ai-engineer)
└── src/recommendations/             # Recommendation engine (ai-engineer)

DevOps Team:
├── tests/                           # All tests (test-writer-fixer)
├── .github/workflows/               # CI/CD (devops-automator)
├── justfile                         # Task automation (devops-automator)
├── Dockerfile                       # Container (devops-automator)
└── scripts/                         # Automation scripts (devops-automator)
```

### 2. Workstream-to-Agent Mapping

| Workstream | Primary Agent | Secondary Agents |
|------------|---------------|------------------|
| WS1: MCP Server Foundation | backend-architect | ai-engineer |
| WS2: Hardware Detection | infrastructure-maintainer | backend-architect |
| WS3: MCP Resources & Tools | ai-engineer | backend-architect |
| WS4: Documentation System | frontend-developer | ai-engineer |
| WS5: DGX Spark Intelligence | ai-engineer | backend-architect |
| WS6: Testing & DevOps | test-writer-fixer | devops-automator |

### 3. Hook-Based Coordination Protocol

Every agent MUST execute coordination hooks at specific points:

#### Pre-Task Hook
```bash
# Execute BEFORE starting any work
npx claude-flow@alpha hooks pre-task \
  --description "Implement GPU detection module" \
  --agent-id "infra-maintainer-001" \
  --session-id "swarm-dgx-mcp-build"
```

#### Post-Edit Hook
```bash
# Execute AFTER each significant file change
npx claude-flow@alpha hooks post-edit \
  --file "src/hardware/gpu.ts" \
  --memory-key "swarm/dgx-mcp/hardware/gpu-detection-complete" \
  --agent-id "infra-maintainer-001"
```

#### Post-Task Hook
```bash
# Execute AFTER completing workstream task
npx claude-flow@alpha hooks post-task \
  --task-id "ws-2-gpu-detection-complete" \
  --status "complete" \
  --output-files "src/hardware/gpu.ts,src/types/gpu.ts" \
  --agent-id "infra-maintainer-001"
```

## Parallel Execution Patterns

### Pattern 1: Independent Foundation Work (Wave 1)

Workstreams 1, 2, and 4 can start immediately as they have no dependencies:

```javascript
// Launch all foundation agents in parallel
Task("Backend Architect", "Workstream 1: Build MCP server foundation with TypeScript, MCP SDK, config system, logging. Store completion in memory: swarm/dgx-mcp/ws-1/complete", "backend-architect")

Task("Infrastructure Maintainer", "Workstream 2: Implement hardware detection for GPU, CPU, memory, storage, network. Store completion in memory: swarm/dgx-mcp/ws-2/complete", "infrastructure-maintainer")

Task("Frontend Developer", "Workstream 4: Build documentation system with indexing, search, markdown parsing. Store completion in memory: swarm/dgx-mcp/ws-4/complete", "frontend-developer")
```

### Pattern 2: Dependent Integration Work (Wave 2)

Workstreams 3 and 5 depend on completions from Wave 1:

```javascript
// These agents wait for dependencies before starting
Task("AI Engineer (MCP)", "Workstream 3: Implement MCP resources and tools. WAIT for: swarm/dgx-mcp/ws-1/complete AND swarm/dgx-mcp/ws-2/complete. Store completion in memory: swarm/dgx-mcp/ws-3/complete", "ai-engineer")

Task("AI Engineer (Intelligence)", "Workstream 5: Build Spark intelligence (optimizer, estimators, recommendations). WAIT for: swarm/dgx-mcp/ws-2/complete AND swarm/dgx-mcp/ws-3/complete. Store completion in memory: swarm/dgx-mcp/ws-5/complete", "ai-engineer")
```

### Pattern 3: Final Integration (Wave 3)

Workstream 6 runs last to test everything:

```javascript
// Testing waits for all implementations
Task("Test Writer & DevOps", "Workstream 6: Create tests, CI/CD, deployment automation. WAIT for ALL workstreams: ws-1, ws-2, ws-3, ws-4, ws-5. Store completion in memory: swarm/dgx-mcp/ws-6/complete", "test-writer-fixer,devops-automator")
```

## Memory-Based Communication

### Memory Key Structure

```
swarm/dgx-mcp/
├── ws-1/
│   ├── complete          # Workstream 1 complete
│   ├── server-setup      # Server configured
│   └── config-system     # Config system ready
├── ws-2/
│   ├── complete          # Workstream 2 complete
│   ├── gpu-detection     # GPU detection working
│   ├── topology-complete # Full topology mapped
│   └── hardware-api      # Hardware API ready
├── ws-3/
│   ├── complete          # Workstream 3 complete
│   ├── resources-complete# All resources implemented
│   └── tools-complete    # All tools implemented
├── ws-4/
│   ├── complete          # Workstream 4 complete
│   ├── indexer-complete  # Indexer working
│   └── docs-written      # Documentation complete
├── ws-5/
│   ├── complete          # Workstream 5 complete
│   ├── optimizer-complete# Spark optimizer ready
│   └── recommendations-complete # Recommendation engine ready
└── ws-6/
    ├── complete          # Workstream 6 complete
    ├── testing-setup     # Tests configured
    └── cicd-complete     # CI/CD operational
```

### Storing Information

```javascript
// After completing GPU detection
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/dgx-mcp/ws-2/gpu-detection",
  namespace: "coordination",
  value: JSON.stringify({
    gpuCount: 8,
    gpuModel: "NVIDIA A100",
    totalMemory: "640GB",
    nvlinkTopology: true,
    implementationFile: "src/hardware/gpu.ts",
    completed_by: "infra-maintainer-001",
    timestamp: Date.now()
  })
}
```

### Checking Dependencies

```javascript
// Before starting Workstream 3, check dependencies
mcp__claude-flow__memory_usage {
  action: "retrieve",
  key: "swarm/dgx-mcp/ws-1/complete",
  namespace: "coordination"
}

mcp__claude-flow__memory_usage {
  action: "retrieve",
  key: "swarm/dgx-mcp/ws-2/complete",
  namespace: "coordination"
}
```

## File Ownership Matrix

### Exclusive Ownership (No Conflicts)

| Directory/File | Owner Agent | Access Level |
|----------------|-------------|--------------|
| `src/server.ts` | backend-architect | Exclusive Write |
| `src/hardware/*` | infrastructure-maintainer | Exclusive Write |
| `src/resources/*` | ai-engineer | Exclusive Write |
| `src/tools/*` | ai-engineer | Exclusive Write |
| `src/docs/*` | frontend-developer | Exclusive Write |
| `src/optimizers/*` | ai-engineer | Exclusive Write |
| `tests/*` | test-writer-fixer | Exclusive Write |
| `.github/workflows/*` | devops-automator | Exclusive Write |

### Shared Ownership (Coordination Required)

| Directory/File | Owners | Coordination Method |
|----------------|--------|---------------------|
| `README.md` | All agents | Post-edit hook required |
| `package.json` | backend-architect + devops-automator | Memory locks |
| `src/types/*` | Multiple agents | Version control + hooks |
| `docs/architecture/*` | backend-architect + ai-engineer | Post-edit hooks |

## Dependency Graph

```
WS1 (MCP Foundation) ──┬──> WS3 (Resources & Tools) ──┬──> WS6 (Testing)
                       │                              │
WS2 (Hardware) ────────┼──> WS3                      │
                       │                              │
                       └──> WS5 (Intelligence) ───────┘

WS4 (Documentation) ───────────────────────────────────> WS6
```

## Conflict Resolution

### 1. File Locking

Before modifying shared files:

```bash
npx claude-flow@alpha hooks lock-file \
  --file "package.json" \
  --agent-id "backend-architect-001" \
  --timeout 300
```

### 2. Priority Rules

1. **Foundation First**: WS1 changes take precedence
2. **Type Definitions**: Must be backward compatible
3. **Testing Required**: All changes must pass existing tests
4. **Documentation Updates**: Update docs with code changes

## Best Practices

### 1. Always Use Hooks
- **Never skip hooks** - they enable coordination
- Execute in correct order: pre-task → post-edit → post-task
- Include meaningful descriptions and context

### 2. Clear Ownership
- **One owner per file** when possible
- Document shared ownership explicitly
- Use memory to coordinate shared access

### 3. Atomic Commits
- Complete logical units of work
- Test before marking complete
- Update documentation with code

### 4. Memory as Source of Truth
- Store all coordination state in memory
- Use structured keys: `swarm/dgx-mcp/{workstream}/{resource}`
- Include timestamps and agent IDs

## Example Coordination Workflow

### Scenario: Building GPU Detection → Exposing via MCP Resource

**Wave 1: Foundation (parallel)**

```javascript
// Backend Architect
Task("Backend Architect", `
1. Initialize TypeScript project
2. Set up MCP SDK integration
3. Create server lifecycle
4. Store completion: swarm/dgx-mcp/ws-1/complete
`, "backend-architect")

// Infrastructure Maintainer
Task("Infrastructure Maintainer", `
1. Implement GPU detection with nvidia-smi
2. Create hardware topology mapper
3. Test on real DGX hardware
4. Store GPU detection API: swarm/dgx-mcp/ws-2/gpu-detection
5. Store completion: swarm/dgx-mcp/ws-2/complete
`, "infrastructure-maintainer")
```

**Wave 2: Integration (depends on Wave 1)**

```javascript
// AI Engineer waits for both dependencies
Task("AI Engineer", `
PRE-TASK: Check memory for:
  - swarm/dgx-mcp/ws-1/complete
  - swarm/dgx-mcp/ws-2/gpu-detection

1. Implement MCP resource: dgx://hardware/gpus
2. Use GPU detection API from WS2
3. Implement MCP tool: check_gpu_availability
4. Test end-to-end MCP protocol
5. Store completion: swarm/dgx-mcp/ws-3/complete
`, "ai-engineer")
```

**Wave 3: Testing (depends on all)**

```javascript
Task("Test Writer", `
PRE-TASK: Check memory for all workstream completions

1. Write unit tests for all modules
2. Write integration tests for MCP
3. Set up CI/CD pipeline
4. Run full test suite
5. Store completion: swarm/dgx-mcp/ws-6/complete
`, "test-writer-fixer")
```

## Troubleshooting

### Issue: Agent Blocked Waiting for Dependency

**Diagnosis:**
```bash
npx claude-flow@alpha hooks task-status \
  --task-id "ws-3-resources" \
  --show-dependencies true
```

**Solution:**
- Check if dependency workstream completed
- Verify memory key exists
- Consider manual unblock if dependency failed

### Issue: File Conflict

**Diagnosis:**
```bash
npx claude-flow@alpha hooks list-locks \
  --file "src/types/hardware.ts"
```

**Solution:**
- Identify lock holder
- Coordinate merge strategy
- Use conflict resolution hook

## Summary

Effective agent coordination requires:
1. ✅ Clear workstream-to-agent mapping
2. ✅ Dependency awareness (use memory checks)
3. ✅ Consistent hook execution
4. ✅ File ownership boundaries
5. ✅ Memory-based communication
6. ✅ Wave-based parallel execution

Follow these patterns to achieve **3-5x speed improvements** through parallel execution while maintaining code quality.
