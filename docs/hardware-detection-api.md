# Hardware Detection API

## Overview

The hardware detection system provides comprehensive access to system hardware information including GPUs, CPUs, memory, storage, and network devices. It features intelligent caching to minimize system calls and supports both individual component detection and complete system topology mapping.

## Architecture

```
hardware/
├── gpu.ts              # NVIDIA GPU detection via nvidia-smi
├── cpu.ts              # CPU detection via /proc/cpuinfo
├── memory.ts           # Memory detection via /proc/meminfo
├── storage.ts          # Storage detection via lsblk/df
├── network.ts          # Network detection via ip/ibstat
├── topology.ts         # System topology orchestrator
├── detector.ts         # Main detection API
├── cache.ts            # Hardware detection cache
├── nvidia-smi.ts       # nvidia-smi command wrapper
└── index.ts            # Public API exports
```

## Quick Start

```typescript
import { getHardwareSummary, detectAll, getTopology } from './hardware';

// Get quick hardware summary
const summary = await getHardwareSummary();
console.log(`CPU: ${summary.cpu}`);
console.log(`Memory: ${summary.memoryGB} GB`);
console.log(`GPUs: ${summary.gpuCount}`);

// Detect all hardware components
const all = await detectAll();
console.log('CPUs:', all.cpu.cpu.cores);
console.log('Memory:', all.memory.memory.info.total);
console.log('GPUs:', all.gpu?.gpus.length || 0);

// Get complete system topology with caching
const { topology } = await getTopology({ useCache: true });
console.log('System:', topology.hostname);
console.log('OS:', topology.os);
console.log('Capabilities:', topology.capabilities);
```

## API Reference

### Main Detection Functions

#### `detectAll(options?: DetectionOptions): Promise<AllHardwareDetectionResult>`

Detects all hardware components in parallel.

**Parameters:**
- `options.includeGPU` (boolean, default: true) - Include GPU detection
- `options.includeCPU` (boolean, default: true) - Include CPU detection
- `options.includeMemory` (boolean, default: true) - Include memory detection
- `options.includeStorage` (boolean, default: true) - Include storage detection
- `options.includeNetwork` (boolean, default: true) - Include network detection

**Returns:**
```typescript
{
  gpu?: GPUDetectionResult;
  cpu: CPUDetectionResult;
  memory: MemoryDetectionResult;
  storage: StorageDetectionResult;
  network: NetworkDetectionResult;
  timestamp: number;
  totalDetectionTime: number;
}
```

#### `getTopology(options?: DetectionOptions): Promise<HardwareSnapshot>`

Gets complete system topology with intelligent caching.

**Parameters:**
- `options.useCache` (boolean, default: true) - Use cached topology if available
- `options.cacheTTL` (number, optional) - Cache time-to-live in milliseconds

**Returns:**
```typescript
{
  topology: SystemTopology;
  timestamp: number;
  detectionTime: number;
  cached: boolean;
}
```

#### `getHardwareSummary(): Promise<HardwareSummary>`

Gets a quick summary of hardware specifications.

**Returns:**
```typescript
{
  hostname: string;
  cpu: string;
  cpuCores: { physical: number; logical: number };
  memoryGB: number;
  gpuCount: number;
  gpuModel?: string;
  storageGB: number;
  networkInterfaces: number;
  hasInfiniBand: boolean;
  hasNVMe: boolean;
}
```

### GPU Detection

#### `detectGPUs(includeTopology?: boolean): Promise<GPUDetectionResult>`

Detects all NVIDIA GPUs in the system.

**Parameters:**
- `includeTopology` (boolean, default: false) - Include NVLink topology and PCIe information

**Returns:**
```typescript
{
  gpus: GPU[];
  topology?: GPUTopology;
  timestamp: number;
  detectionTime: number;
}
```

#### GPU Information

Each GPU object contains:
- `id`: GPU index
- `uuid`: Unique identifier
- `name`: GPU model name
- `busId`: PCIe bus ID
- `memory`: Total/used/free memory
- `utilization`: GPU and memory utilization percentages
- `temperature`: Current/max/slowdown/shutdown temperatures
- `power`: Current/limit/default power usage
- `clocks`: Graphics/SM/memory/video clock speeds
- `computeCapability`: CUDA compute capability
- `driverVersion`: NVIDIA driver version
- `cudaVersion`: CUDA version
- `nvlinks?`: NVLink connections (if topology requested)

**Helper Functions:**
- `getGPUCount(): Promise<number>` - Get total GPU count
- `hasNVIDIAGPUs(): Promise<boolean>` - Check if NVIDIA GPUs are available
- `getTotalGPUMemory(): Promise<number>` - Get total GPU memory across all GPUs
- `getAvailableGPUMemory(): Promise<number>` - Get available GPU memory

### CPU Detection

#### `detectCPU(): Promise<CPUDetectionResult>`

Detects CPU specifications from /proc/cpuinfo.

**Returns:**
```typescript
{
  cpu: CPU;
  cores?: CPUCore[];
  timestamp: number;
  detectionTime: number;
}
```

#### CPU Information

- `vendor`: CPU vendor (Intel, AMD, etc.)
- `modelName`: CPU model name
- `architecture`: CPU architecture (x86_64, aarch64, etc.)
- `cores`: Physical and logical core counts
- `threads`: Total thread count
- `sockets`: Number of CPU sockets
- `cache`: L1/L2/L3 cache sizes
- `frequency`: Min/max/current frequencies
- `flags`: CPU feature flags
- `virtualization?`: Virtualization support (VT-x, AMD-V)
- `numaNodes?`: NUMA topology

**Helper Functions:**
- `getCPUCount(): Promise<{ physical: number; logical: number }>` - Get core counts
- `getCPUModel(): Promise<string>` - Get CPU model name
- `hasVirtualizationSupport(): Promise<boolean>` - Check virtualization support
- `hasNUMA(): Promise<boolean>` - Check if system has NUMA

### Memory Detection

#### `detectMemory(includeModules?: boolean): Promise<MemoryDetectionResult>`

Detects system memory from /proc/meminfo.

**Parameters:**
- `includeModules` (boolean, default: false) - Include physical memory module information (requires root)

**Returns:**
```typescript
{
  memory: Memory;
  timestamp: number;
  detectionTime: number;
}
```

#### Memory Information

- `info.total`: Total system RAM
- `info.available`: Available RAM
- `info.used`: Used RAM
- `info.free`: Free RAM
- `info.swapTotal`: Total swap space
- `info.swapUsed`: Used swap space
- `modules?`: Physical memory modules (if requested and root)
- `hugepages?`: Hugepages configuration

**Helper Functions:**
- `getTotalMemory(): Promise<number>` - Get total system memory
- `getAvailableMemory(): Promise<number>` - Get available memory
- `getMemoryUtilization(): Promise<number>` - Get memory utilization percentage
- `hasSwap(): Promise<boolean>` - Check if swap is configured

### Storage Detection

#### `detectStorage(includeNVMe?: boolean, includeRAID?: boolean): Promise<StorageDetectionResult>`

Detects storage devices and configuration.

**Parameters:**
- `includeNVMe` (boolean, default: true) - Include NVMe device detection
- `includeRAID` (boolean, default: true) - Include RAID array detection

**Returns:**
```typescript
{
  storage: Storage;
  timestamp: number;
  detectionTime: number;
}
```

#### Storage Information

- `blockDevices`: All block devices from lsblk
- `mountPoints`: All mounted filesystems
- `nvmeDevices?`: NVMe device information
- `raidArrays?`: RAID array configuration
- `totalCapacity`: Total storage capacity
- `totalUsed`: Total used storage
- `totalAvailable`: Total available storage

**Helper Functions:**
- `getTotalStorageCapacity(): Promise<number>` - Get total storage capacity
- `getAvailableStorage(): Promise<number>` - Get available storage
- `getStorageUtilization(): Promise<number>` - Get storage utilization percentage
- `hasNVMe(): Promise<boolean>` - Check if NVMe devices exist
- `hasRAID(): Promise<boolean>` - Check if RAID arrays exist

### Network Detection

#### `detectNetwork(includeInfiniBand?: boolean): Promise<NetworkDetectionResult>`

Detects network interfaces and topology.

**Parameters:**
- `includeInfiniBand` (boolean, default: true) - Include InfiniBand detection

**Returns:**
```typescript
{
  network: Network;
  timestamp: number;
  detectionTime: number;
}
```

#### Network Information

- `interfaces`: All network interfaces
- `infinibandDevices?`: InfiniBand devices (if available)
- `bandwidth?`: Network bandwidth information
- `totalInterfaces`: Total interface count
- `activeInterfaces`: Active interface count

**Helper Functions:**
- `hasInfiniBand(): Promise<boolean>` - Check if InfiniBand is available
- `getActiveInterfaces(): Promise<NetworkInterface[]>` - Get active interfaces only
- `getInterface(name: string): Promise<NetworkInterface | null>` - Get specific interface

### Caching

The hardware detection system includes intelligent caching to reduce system calls.

#### `setCacheTTL(ttl: number): void`

Set default cache time-to-live in milliseconds.

```typescript
setCacheTTL(60000); // 60 seconds
```

#### `clearCache(): void`

Clear all hardware detection cache.

```typescript
clearCache(); // Force fresh detection on next call
```

#### `getCacheStats()`

Get cache statistics.

```typescript
const stats = getCacheStats();
console.log(`Cache size: ${stats.size}`);
console.log(`Oldest entry: ${stats.oldestAge}ms`);
```

## System Requirements

- **Node.js**: 20+
- **Operating System**: Linux (tested on Ubuntu 22.04)
- **Commands Required**:
  - `nvidia-smi` (for GPU detection)
  - `lsblk`, `df` (for storage detection)
  - `ip` (for network detection)
  - `ibstat` (optional, for InfiniBand detection)
  - `nvme` (optional, for NVMe details)
  - `numactl` (optional, for NUMA topology)
  - `dmidecode` (optional, for memory module details, requires root)

## Performance Considerations

- **GPU Detection**: ~100-500ms (depends on GPU count and topology detection)
- **CPU Detection**: ~10-50ms
- **Memory Detection**: ~5-20ms
- **Storage Detection**: ~50-200ms (depends on device count)
- **Network Detection**: ~20-100ms
- **Complete Topology**: ~200-800ms (first call, then cached)

**Caching** significantly reduces subsequent calls to <10ms for cached data.

## Error Handling

All detection functions throw errors when critical components fail to detect. Non-critical detections (like InfiniBand or NVMe) return `undefined` when not available.

```typescript
try {
  const gpus = await detectGPUs();
  console.log(`Found ${gpus.gpus.length} GPUs`);
} catch (error) {
  console.error('GPU detection failed:', error.message);
  // nvidia-smi not available or no GPUs
}
```

## Examples

### Example 1: Monitor GPU Utilization

```typescript
import { detectGPUs } from './hardware';

async function monitorGPUs() {
  const { gpus } = await detectGPUs();

  for (const gpu of gpus) {
    console.log(`GPU ${gpu.id}: ${gpu.name}`);
    console.log(`  Utilization: ${gpu.utilization.gpu}%`);
    console.log(`  Memory: ${gpu.memory.used / gpu.memory.total * 100}%`);
    console.log(`  Temperature: ${gpu.temperature.current}°C`);
  }
}
```

### Example 2: Check System Capacity

```typescript
import { getHardwareSummary } from './hardware';

async function checkCapacity() {
  const summary = await getHardwareSummary();

  const minRequirements = {
    memoryGB: 64,
    gpuCount: 4,
    storageGB: 1000,
  };

  const hasCapacity =
    summary.memoryGB >= minRequirements.memoryGB &&
    summary.gpuCount >= minRequirements.gpuCount &&
    summary.storageGB >= minRequirements.storageGB;

  console.log(`System meets requirements: ${hasCapacity}`);
}
```

### Example 3: Detect DGX-Specific Features

```typescript
import { getTopology } from './hardware';

async function checkDGXFeatures() {
  const { topology } = await getTopology();

  console.log('DGX Features:');
  console.log(`  NVIDIA GPUs: ${topology.capabilities.hasNVIDIA}`);
  console.log(`  InfiniBand: ${topology.capabilities.hasInfiniBand}`);
  console.log(`  NVMe: ${topology.capabilities.hasNVMe}`);
  console.log(`  NUMA: ${topology.capabilities.hasNUMA}`);

  if (topology.gpuTopology) {
    console.log(`  NVLink: Detected`);
    console.log(`  GPU Count: ${topology.gpuTopology.gpus.length}`);
  }
}
```

## Troubleshooting

### GPU Detection Fails

**Problem**: `nvidia-smi not found` error

**Solution**: Ensure NVIDIA drivers are installed and nvidia-smi is in PATH:
```bash
which nvidia-smi
nvidia-smi -L
```

### Memory Module Detection Returns Undefined

**Problem**: `includeModules: true` returns no module information

**Solution**: dmidecode requires root privileges:
```bash
sudo dmidecode --type memory
```

### InfiniBand Not Detected

**Problem**: InfiniBand devices not showing up

**Solution**: Install InfiniBand tools:
```bash
sudo apt-get install infiniband-diags
ibstat
```

## API Types

All TypeScript types are exported from `src/types/`:
- `GPU`, `GPUTopology`, `GPUDetectionResult` - GPU types
- `CPU`, `CPUCore`, `CPUDetectionResult` - CPU types
- `Memory`, `MemoryInfo`, `MemoryDetectionResult` - Memory types
- `Storage`, `BlockDevice`, `StorageDetectionResult` - Storage types
- `Network`, `NetworkInterface`, `NetworkDetectionResult` - Network types
- `SystemTopology`, `HardwareSnapshot` - Topology types
