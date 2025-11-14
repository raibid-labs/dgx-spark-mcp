# Workstream 2: Hardware Detection System

## Status
🟡 Not Started

## Overview
Implement comprehensive hardware detection for DGX systems, including GPU, CPU, memory, storage, and network topology. This provides the foundational data that powers all MCP resources and tools.

## Objectives
- [ ] Implement NVIDIA GPU detection via nvidia-smi
- [ ] Detect CPU specifications from /proc/cpuinfo
- [ ] Detect memory from /proc/meminfo
- [ ] Detect storage devices and capacity
- [ ] Map network interfaces and topology
- [ ] Create system topology visualization
- [ ] Implement caching and refresh strategies

## Agent Assignment
**Suggested Agent Type**: `backend-architect`, `infrastructure-maintainer`
**Skill Requirements**: Linux system programming, NVIDIA tools, Node.js child processes, system architecture

## Dependencies
- Workstream 1 (MCP Server Foundation) must be complete

## Tasks

### Task 2.1: GPU Detection Module
**Description**: Implement comprehensive NVIDIA GPU detection using nvidia-smi CLI.

**Deliverables**:
- GPU count and models
- Memory per GPU (total/used/free)
- Compute capability
- PCIe bus IDs
- GPU utilization metrics
- Temperature and power usage
- NVLink topology

**Files to Create/Modify**:
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/hardware/gpu.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/hardware/nvidia-smi.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/types/gpu.ts`

**Validation**:
```bash
# Test GPU detection
node -e "require('./dist/hardware/gpu').detectGPUs().then(console.log)"

# Verify all GPUs detected
nvidia-smi -L

# Compare output with nvidia-smi
nvidia-smi --query-gpu=name,memory.total,compute_cap --format=csv

# Test topology detection
nvidia-smi topo -m
```

### Task 2.2: CPU Detection Module
**Description**: Parse /proc/cpuinfo and detect CPU specifications.

**Deliverables**:
- CPU model and vendor
- Core count (physical/logical)
- Thread count
- Cache sizes (L1/L2/L3)
- CPU frequency
- CPU flags and capabilities
- NUMA topology

**Files to Create/Modify**:
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/hardware/cpu.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/types/cpu.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/utils/proc-parser.ts`

**Validation**:
```bash
# Test CPU detection
node -e "require('./dist/hardware/cpu').detectCPU().then(console.log)"

# Verify against system
lscpu
cat /proc/cpuinfo | grep "model name" | head -1

# Check NUMA topology
numactl --hardware
```

### Task 2.3: Memory Detection Module
**Description**: Parse /proc/meminfo and detect system memory specifications.

**Deliverables**:
- Total RAM
- Available RAM
- Memory speed/type (from dmidecode if available)
- Swap configuration
- Memory utilization

**Files to Create/Modify**:
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/hardware/memory.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/types/memory.ts`

**Validation**:
```bash
# Test memory detection
node -e "require('./dist/hardware/memory').detectMemory().then(console.log)"

# Verify against system
free -h
cat /proc/meminfo | grep MemTotal

# Check memory details (requires root)
sudo dmidecode --type memory | grep -E "Size|Speed|Type"
```

### Task 2.4: Storage Detection Module
**Description**: Detect storage devices, capacity, and mount points.

**Deliverables**:
- Block device list
- Device capacity and usage
- Mount points
- Filesystem types
- NVMe device detection
- RAID configuration (if applicable)

**Files to Create/Modify**:
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/hardware/storage.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/types/storage.ts`

**Validation**:
```bash
# Test storage detection
node -e "require('./dist/hardware/storage').detectStorage().then(console.log)"

# Verify against system
lsblk
df -h
nvme list  # If NVMe devices present
```

### Task 2.5: Network Topology Module
**Description**: Detect network interfaces and topology including InfiniBand if present.

**Deliverables**:
- Network interface list
- Interface speeds and status
- IP addresses
- InfiniBand detection (ibstat)
- Network bandwidth capabilities

**Files to Create/Modify**:
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/hardware/network.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/types/network.ts`

**Validation**:
```bash
# Test network detection
node -e "require('./dist/hardware/network').detectNetwork().then(console.log)"

# Verify against system
ip link show
ip addr show
ibstat  # If InfiniBand present
```

### Task 2.6: System Topology Orchestrator
**Description**: Combine all hardware detection into unified system topology.

**Deliverables**:
- Complete system snapshot
- Topology visualization data
- Hardware capability summary
- Caching with TTL
- Refresh strategies

**Files to Create/Modify**:
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/hardware/topology.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/hardware/detector.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/hardware/cache.ts`
- `/home/beengud/raibid-labs/dgx-spark-mcp/src/types/topology.ts`

**Validation**:
```bash
# Test complete topology detection
node -e "require('./dist/hardware/detector').detectAll().then(d => console.log(JSON.stringify(d, null, 2)))"

# Test caching
node -e "const d = require('./dist/hardware/detector'); d.detectAll().then(() => d.detectAll()).then(console.log)"

# Verify refresh on cache expiry
# (wait for TTL to expire and verify re-detection)
```

## Definition of Done
- [ ] GPU detection returns all NVIDIA GPUs with specs
- [ ] CPU detection returns accurate core/thread counts
- [ ] Memory detection returns total and available RAM
- [ ] Storage detection lists all block devices
- [ ] Network detection includes all interfaces
- [ ] System topology combines all hardware info
- [ ] Caching reduces redundant system calls
- [ ] All detection modules have error handling
- [ ] Documentation includes hardware requirements
- [ ] Validation scripts passing on DGX system

## Agent Coordination Hooks
```bash
# BEFORE Work:
npx claude-flow@alpha hooks pre-task --description "workstream-2-hardware-detection"
npx claude-flow@alpha hooks session-restore --session-id "swarm-dgx-mcp-ws-2"

# DURING Work:
npx claude-flow@alpha hooks post-edit --file "/home/beengud/raibid-labs/dgx-spark-mcp/src/hardware/gpu.ts" --memory-key "swarm/dgx-mcp/ws-2/gpu-detection"
npx claude-flow@alpha hooks post-edit --file "/home/beengud/raibid-labs/dgx-spark-mcp/src/hardware/topology.ts" --memory-key "swarm/dgx-mcp/ws-2/topology-complete"
npx claude-flow@alpha hooks notify --message "Hardware detection system complete"

# AFTER Work:
npx claude-flow@alpha hooks post-task --task-id "ws-2-complete"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## Estimated Effort
**Duration**: 3-4 days
**Complexity**: Medium-High

## References
- [nvidia-smi Documentation](https://developer.nvidia.com/nvidia-system-management-interface)
- [Linux /proc Filesystem](https://www.kernel.org/doc/html/latest/filesystems/proc.html)
- [lscpu man page](https://man7.org/linux/man-pages/man1/lscpu.1.html)
- [InfiniBand Tools](https://linux.die.net/man/8/ibstat)

## Notes
- nvidia-smi must be in PATH
- Some detection may require root (dmidecode)
- Handle missing hardware gracefully (e.g., no InfiniBand)
- Cache should invalidate on hardware changes
- Consider emitting events on hardware state changes
- Performance: Minimize system calls via caching
- Document minimum NVIDIA driver version required
