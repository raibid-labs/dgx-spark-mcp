# DGX-Spark MCP Server - Architecture Overview

## Vision

The DGX-Spark MCP Server provides persistent hardware context and intelligent Spark configuration assistance to Claude Code, eliminating the problem of forgotten system capabilities and enabling optimal resource utilization on NVIDIA DGX systems.

## Problem Statement

When working with DGX systems running Spark workloads, Claude Code currently:
- ❌ Doesn't remember hardware specifications between sessions
- ❌ Can't detect current GPU availability
- ❌ Lacks context about DGX-specific optimizations
- ❌ Can't generate optimal Spark configurations for the hardware
- ❌ Doesn't have access to DGX Spark documentation

## Solution Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code                             │
│                   (MCP Client)                              │
└─────────────────┬───────────────────────────────────────────┘
                  │ MCP Protocol (JSON-RPC 2.0)
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              DGX-Spark MCP Server                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MCP Server Core (TypeScript + MCP SDK)              │  │
│  └─────┬────────────────────────────────────────────┬───┘  │
│        │                                            │       │
│  ┌─────▼────────────────┐                  ┌────────▼─────┐ │
│  │  MCP Resources       │                  │  MCP Tools   │ │
│  │                      │                  │              │ │
│  │  • hardware/specs    │                  │  • check_gpu │ │
│  │  • hardware/topology │                  │  • get_config│ │
│  │  • system/caps       │                  │  • estimate  │ │
│  │  • docs/spark/*      │                  │  • health    │ │
│  └─────┬────────────────┘                  └────────┬─────┘ │
│        │                                            │       │
│  ┌─────▼────────────────────────────────────────────▼─────┐ │
│  │           Intelligence Layer                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐    │ │
│  │  │Optimizer │  │Estimator │  │  Recommendation   │    │ │
│  │  │          │  │          │  │     Engine        │    │ │
│  │  └──────────┘  └──────────┘  └───────────────────┘    │ │
│  └───────────────────────┬────────────────────────────────┘ │
│                          │                                  │
│  ┌───────────────────────▼────────────────────────────────┐ │
│  │          Hardware Detection Layer                      │ │
│  │  ┌─────┐  ┌─────┐  ┌──────┐  ┌────────┐  ┌─────────┐ │ │
│  │  │ GPU │  │ CPU │  │Memory│  │Storage │  │ Network │ │ │
│  │  └─────┘  └─────┘  └──────┘  └────────┘  └─────────┘ │ │
│  └───────────────────────┬────────────────────────────────┘ │
│                          │                                  │
│  ┌───────────────────────▼────────────────────────────────┐ │
│  │          Documentation System                          │ │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────┐    │ │
│  │  │Indexer │  │Search  │  │ Parser │  │  Loader  │    │ │
│  │  └────────┘  └────────┘  └────────┘  └──────────┘    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                DGX Hardware                                 │
│  • 8x NVIDIA A100/H100 GPUs                                 │
│  • NVLink Interconnect                                      │
│  • High-speed InfiniBand Network                           │
│  • Apache Spark + RAPIDS                                    │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. MCP Server Core
- **Technology**: TypeScript + @modelcontextprotocol/sdk
- **Responsibilities**:
  - MCP protocol implementation
  - Request routing
  - Lifecycle management
  - Configuration management
  - Logging and error handling

### 2. Hardware Detection Layer
- **Components**: GPU, CPU, Memory, Storage, Network detectors
- **Responsibilities**:
  - Detect all hardware via system interfaces (nvidia-smi, /proc, etc.)
  - Build system topology map
  - Cache hardware state with TTL
  - Emit events on hardware changes

### 3. MCP Resources (Static Context)
- `dgx://hardware/specs` - Complete hardware specifications
- `dgx://hardware/topology` - System topology and interconnects
- `dgx://hardware/gpus` - GPU-specific details
- `dgx://system/capabilities` - What the system can do
- `dgx://docs/spark/{topic}` - DGX Spark documentation

### 4. MCP Tools (Dynamic Operations)
- `check_gpu_availability` - Current GPU utilization and availability
- `get_optimal_spark_config` - Generate Spark config for workload
- `search_documentation` - Search DGX Spark docs
- `estimate_resources` - Estimate job resource requirements
- `get_system_health` - Current system health status

### 5. Intelligence Layer

#### Spark Optimizer
- Executor memory/core allocation
- Driver configuration
- Shuffle optimization
- GPU-specific tuning (RAPIDS)

#### Workload Analyzer
- Classify workload type (ETL, ML, SQL, etc.)
- Estimate compute intensity
- Predict I/O patterns
- Estimate GPU utilization

#### Resource Estimator
- Memory requirements
- CPU/GPU needs
- Execution time prediction

#### Recommendation Engine
- Performance optimization suggestions
- Best practice validation
- Configuration anti-pattern detection

### 6. Documentation System
- **Indexer**: Scans and indexes markdown documentation
- **Search**: Full-text search with ranking
- **Parser**: Markdown to structured data
- **Loader**: Serves docs via MCP resources

## Data Flow

### Example: Getting Optimal Spark Config

```
1. Claude Code calls tool: get_optimal_spark_config
   ↓
2. MCP Server receives request
   ↓
3. Workload Analyzer classifies workload
   ↓
4. Hardware Detection provides current GPU state
   ↓
5. Spark Optimizer generates configuration
   ↓
6. Best Practices Validator checks config
   ↓
7. Recommendation Engine adds suggestions
   ↓
8. MCP Server returns optimized config to Claude
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 20+ | Server runtime |
| Language | TypeScript | Type safety |
| MCP | @modelcontextprotocol/sdk | MCP protocol |
| Hardware Detection | nvidia-smi, /proc APIs | System info |
| Documentation | lunr.js, gray-matter | Search & parsing |
| Testing | Jest | Unit/integration tests |
| CI/CD | GitHub Actions | Automation |
| Deployment | Systemd / Docker | Production |

## Key Design Decisions

### 1. TypeScript over Python
- **Rationale**: Better MCP SDK support, type safety, faster startup
- **Trade-off**: Some hardware detection libraries better in Python

### 2. Caching Strategy
- **Hardware**: Cache for 60 seconds (hardware doesn't change often)
- **Docs**: Cache indefinitely (invalidate on file changes)
- **GPU State**: Cache for 5 seconds (utilization changes frequently)

### 3. Monolithic vs Microservices
- **Decision**: Monolithic MCP server
- **Rationale**: Simpler deployment, lower latency, easier coordination
- **Future**: Could split if needed

### 4. Documentation Approach
- **Decision**: Bundle critical docs + fetch external docs
- **Rationale**: Works offline but stays updated
- **Implementation**: Local markdown + NVIDIA docs caching

## Deployment Architecture

### Development
```bash
npm run dev  # Hot reload with tsx
```

### Production (Systemd)
```bash
systemctl start dgx-spark-mcp
# Server runs as daemon
# Logs to journald
```

### Production (Docker)
```bash
docker run -v /dev/nvidiactl:/dev/nvidiactl dgx-spark-mcp
# Needs access to nvidia devices
```

## Security Considerations

1. **Read-Only Hardware Access**: No hardware modification capability
2. **No Network Exposure**: Stdio transport only (local communication)
3. **Input Validation**: All tool arguments validated with Zod
4. **Resource Limits**: Prevent infinite loops in recommendations
5. **Safe Documentation**: No code execution from docs

## Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Server Startup | < 2s | Fast Claude Code integration |
| Resource Response | < 50ms | Cached data |
| Tool Execution | < 500ms | Real-time hardware queries |
| GPU Detection | < 200ms | nvidia-smi is fast |
| Doc Search | < 100ms | In-memory index |
| Memory Usage | < 200MB | Lightweight |

## Scalability

### Current Scope
- Single DGX system
- One MCP server instance per machine
- Stdio transport (no network)

### Future Expansion
- Multi-node DGX clusters
- Network transport (WebSocket)
- Central configuration management
- Shared performance model across nodes

## Development Workflow

### Parallel Workstreams

The project is organized into 6 parallel workstreams:

**Wave 1** (Independent, start immediately):
- WS1: MCP Server Foundation
- WS2: Hardware Detection System
- WS4: Documentation System

**Wave 2** (Depends on Wave 1):
- WS3: MCP Resources & Tools (needs WS1 + WS2)
- WS5: DGX Spark Intelligence (needs WS2 + WS3)

**Wave 3** (Integration):
- WS6: Testing & DevOps (needs all workstreams)

### Agent Coordination
See `docs/agents/coordination.md` for multi-agent development patterns.

## Testing Strategy

1. **Unit Tests**: Individual modules with mocked dependencies
2. **Integration Tests**: Full MCP protocol testing
3. **Hardware Mocks**: CI tests use mocked hardware
4. **Real Hardware Tests**: Manual validation on DGX
5. **Performance Tests**: Benchmark critical paths

## Monitoring & Observability

- **Logs**: Structured JSON logs via Winston
- **Metrics**: Prometheus metrics export
- **Health**: `/health` endpoint for monitoring
- **Telemetry**: Tool usage tracking (optional)

## Success Criteria

### Functional
- ✅ Detects all GPUs accurately
- ✅ Generates valid Spark configurations
- ✅ Provides relevant documentation
- ✅ Responds within latency targets
- ✅ Handles errors gracefully

### Non-Functional
- ✅ 80%+ test coverage
- ✅ CI/CD pipeline functional
- ✅ Documentation complete
- ✅ Deployment automated
- ✅ Monitoring operational

## Future Enhancements

1. **Vector Search**: Semantic documentation search
2. **Performance History**: Learn from past job performance
3. **Auto-tuning**: Automatically adjust configs based on results
4. **Multi-Cluster**: Support for DGX clusters
5. **GPU Scheduling**: Recommend job placement across nodes
6. **Cost Optimization**: Minimize resource usage while hitting SLOs

## References

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [NVIDIA DGX Systems](https://www.nvidia.com/en-us/data-center/dgx-platform/)
- [Apache Spark on GPUs (RAPIDS)](https://nvidia.github.io/spark-rapids/)
