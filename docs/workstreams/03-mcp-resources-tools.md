# Workstream 3: MCP Resources & Tools

## Status
🟡 Not Started

## Overview
Implement MCP resources and tools that expose hardware capabilities and provide intelligent assistance. Resources provide static context (hardware specs, documentation), while tools provide dynamic operations (GPU availability checks, configuration generation).

## Objectives
- [ ] Implement MCP resource handlers for hardware context
- [ ] Implement MCP resource handlers for documentation
- [ ] Implement MCP tools for GPU management
- [ ] Implement MCP tools for Spark configuration
- [ ] Add resource caching and validation
- [ ] Create comprehensive tool error handling

## Agent Assignment
**Suggested Agent Type**: `backend-architect`, `ai-engineer`
**Skill Requirements**: MCP protocol, TypeScript, API design, error handling

## Dependencies
- Workstream 1 (MCP Server Foundation)
- Workstream 2 (Hardware Detection System)

## Tasks

### Task 3.1: Hardware Resource Handlers
**Description**: Implement MCP resources that expose hardware specifications.

**Deliverables**:
- `dgx://hardware/specs` - Complete hardware specs
- `dgx://hardware/topology` - System topology
- `dgx://hardware/gpus` - GPU-specific details
- `dgx://hardware/capabilities` - What system can do
- Resource caching layer

**Files to Create/Modify**:
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/resources/hardware.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/resources/index.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/types/resources.ts`

**Validation**:
```bash
# Test resource listing
echo '{"jsonrpc":"2.0","id":1,"method":"resources/list"}' | node dist/index.js

# Test hardware specs resource
echo '{"jsonrpc":"2.0","id":2,"method":"resources/read","params":{"uri":"dgx://hardware/specs"}}' | node dist/index.js

# Verify JSON structure
node -e "const r = require('./dist/resources/hardware'); r.getHardwareSpecs().then(s => console.log(JSON.stringify(s, null, 2)))"
```

### Task 3.2: System Capabilities Resource
**Description**: Create resource that describes what the DGX system can do.

**Deliverables**:
- `dgx://system/capabilities` - System capabilities
- Max parallel GPU jobs
- Recommended Spark configs
- Supported frameworks
- Performance characteristics

**Files to Create/Modify**:
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/resources/capabilities.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/analyzers/capabilities.ts`

**Validation**:
```bash
# Test capabilities resource
echo '{"jsonrpc":"2.0","id":3,"method":"resources/read","params":{"uri":"dgx://system/capabilities"}}' | node dist/index.js

# Verify capability calculations
node -e "require('./dist/analyzers/capabilities').analyzeCapabilities().then(console.log)"
```

### Task 3.3: Documentation Resources
**Description**: Expose DGX Spark documentation via MCP resources.

**Deliverables**:
- `dgx://docs/spark/{topic}` - Documentation by topic
- Topic index
- Markdown rendering
- Cross-references

**Files to Create/Modify**:
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/resources/docs.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/docs/loader.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/docs/spark/installation.md`
- `/home/beengud/raibid-labs/dgx-spark-mcp/docs/spark/configuration.md`
- `/home/beengud/raibid-labs/dgx-spark-mcp/docs/spark/tuning.md`

**Validation**:
```bash
# List available docs
echo '{"jsonrpc":"2.0","id":4,"method":"resources/list"}' | node dist/index.js | grep "dgx://docs"

# Read installation docs
echo '{"jsonrpc":"2.0","id":5,"method":"resources/read","params":{"uri":"dgx://docs/spark/installation"}}' | node dist/index.js
```

### Task 3.4: GPU Availability Tool
**Description**: Implement tool to check current GPU availability.

**Deliverables**:
- `check_gpu_availability` tool
- Returns available GPUs
- Current utilization per GPU
- Memory usage
- Recommendations for job placement

**Files to Create/Modify**:
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/tools/gpu-availability.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/tools/index.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/types/tools.ts`

**Validation**:
```bash
# List available tools
echo '{"jsonrpc":"2.0","id":6,"method":"tools/list"}' | node dist/index.js

# Call GPU availability tool
echo '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"check_gpu_availability"}}' | node dist/index.js

# Verify against nvidia-smi
nvidia-smi --query-gpu=index,utilization.gpu,memory.used,memory.total --format=csv
```

### Task 3.5: Optimal Spark Config Tool
**Description**: Generate optimal Spark configuration based on workload and hardware.

**Deliverables**:
- `get_optimal_spark_config` tool
- Input: workload type, data size
- Output: Recommended Spark config
- Executor memory/cores
- Driver configuration
- Shuffle optimization

**Files to Create/Modify**:
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/tools/spark-config.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/optimizers/spark.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/types/spark.ts`

**Validation**:
```bash
# Test Spark config generation
echo '{"jsonrpc":"2.0","id":8,"method":"tools/call","params":{"name":"get_optimal_spark_config","arguments":{"workloadType":"ml-training","dataSize":"100GB"}}}' | node dist/index.js

# Verify config recommendations
node -e "const s = require('./dist/optimizers/spark'); s.generateConfig({workloadType: 'ml-training', dataSize: '100GB'}).then(console.log)"
```

### Task 3.6: Additional Tools Suite
**Description**: Implement remaining MCP tools for comprehensive DGX support.

**Deliverables**:
- `search_documentation` - Search docs by query
- `estimate_resources` - Estimate job resource needs
- `get_system_health` - Current system health
- Tool input validation
- Tool error responses

**Files to Create/Modify**:
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/tools/search-docs.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/tools/estimate-resources.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/tools/system-health.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/tools/validation.ts`

**Validation**:
```bash
# Test documentation search
echo '{"jsonrpc":"2.0","id":9,"method":"tools/call","params":{"name":"search_documentation","arguments":{"query":"GPU memory"}}}' | node dist/index.js

# Test resource estimation
echo '{"jsonrpc":"2.0","id":10,"method":"tools/call","params":{"name":"estimate_resources","arguments":{"description":"Train 1B parameter model"}}}' | node dist/index.js

# Test system health
echo '{"jsonrpc":"2.0","id":11,"method":"tools/call","params":{"name":"get_system_health"}}' | node dist/index.js
```

## Definition of Done
- [ ] All hardware resources implemented and tested
- [ ] Documentation resources serving content
- [ ] GPU availability tool working
- [ ] Spark config tool generating valid configs
- [ ] All additional tools implemented
- [ ] Resource caching operational
- [ ] Tool input validation complete
- [ ] Error handling comprehensive
- [ ] MCP protocol compliance verified
- [ ] Documentation for all resources/tools

## Agent Coordination Hooks
```bash
# BEFORE Work:
npx claude-flow@alpha hooks pre-task --description "workstream-3-mcp-resources-tools"
npx claude-flow@alpha hooks session-restore --session-id "swarm-dgx-mcp-ws-3"
npx claude-flow@alpha hooks check-dependency --key "swarm/dgx-mcp/ws-2/topology-complete"

# DURING Work:
npx claude-flow@alpha hooks post-edit --file "/home/beengud/raibid-labs/dgx-spark-mcp/src/resources/hardware.ts" --memory-key "swarm/dgx-mcp/ws-3/resources-complete"
npx claude-flow@alpha hooks post-edit --file "/home/beengud/raibid-labs/dgx-spark-mcp/src/tools/spark-config.ts" --memory-key "swarm/dgx-mcp/ws-3/tools-complete"
npx claude-flow@alpha hooks notify --message "MCP resources and tools complete"

# AFTER Work:
npx claude-flow@alpha hooks post-task --task-id "ws-3-complete"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## Estimated Effort
**Duration**: 4-5 days
**Complexity**: Medium-High

## References
- [MCP Resources Specification](https://modelcontextprotocol.io/docs/concepts/resources)
- [MCP Tools Specification](https://modelcontextprotocol.io/docs/concepts/tools)
- [Spark Configuration Guide](https://spark.apache.org/docs/latest/configuration.html)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)

## Notes
- All resources should be URI-addressable
- Tools must have clear input/output schemas
- Use Zod for tool argument validation
- Cache resource data when appropriate
- Document tool usage in MCP format
- Consider rate limiting for expensive tools
- Implement telemetry for tool usage
- Handle partial hardware availability gracefully
