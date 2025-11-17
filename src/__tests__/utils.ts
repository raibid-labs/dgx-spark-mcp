/**
 * Test utilities and helper functions
 */

import type { GPU } from '../types/gpu.js';
import type { CPU } from '../types/cpu.js';
import type { MemoryInfo } from '../types/memory.js';
import type { Storage } from '../types/storage.js';
import type { Network } from '../types/network.js';

/**
 * Create a mock GPU for testing
 */
export function createMockGPU(overrides?: Partial<GPU>): GPU {
  return {
    id: 0,
    uuid: 'GPU-12345678-1234-1234-1234-123456789012',
    name: 'NVIDIA A100-SXM4-80GB',
    busId: '0000:07:00.0',
    memory: {
      total: 85899345920, // 80GB
      free: 85899345920,
      used: 0,
    },
    utilization: {
      gpu: 0,
      memory: 0,
    },
    temperature: {
      current: 35,
      max: 90,
      slowdown: 85,
      shutdown: 95,
    },
    power: {
      current: 50,
      limit: 400,
      default: 400,
    },
    clocks: {
      graphics: 1410,
      sm: 1410,
      memory: 1215,
      video: 1275,
    },
    computeCapability: {
      major: 8,
      minor: 0,
    },
    driverVersion: '535.104.12',
    cudaVersion: '12.2',
    ...overrides,
  };
}

/**
 * Create a mock CPU for testing
 */
export function createMockCPU(overrides?: Partial<CPU>): CPU {
  return {
    vendor: 'AMD',
    modelName: 'AMD EPYC 7742 64-Core Processor',
    architecture: 'x86_64',
    cores: {
      physical: 64,
      logical: 128,
    },
    threads: 128,
    sockets: 2,
    frequency: {
      current: 2250,
      min: 1500,
      max: 3400,
    },
    cache: {
      l1d: 2097152,
      l1i: 2097152,
      l2: 33554432,
      l3: 268435456,
    },
    flags: [
      'fpu',
      'vme',
      'de',
      'pse',
      'tsc',
      'msr',
      'pae',
      'mce',
      'cx8',
      'apic',
      'sep',
      'mtrr',
      'pge',
      'mca',
      'cmov',
      'pat',
      'pse36',
      'clflush',
      'mmx',
      'fxsr',
      'sse',
      'sse2',
      'ht',
      'syscall',
      'nx',
      'mmxext',
      'pdpe1gb',
      'rdtscp',
      'lm',
      'avx',
      'avx2',
    ],
    ...overrides,
  };
}

/**
 * Create mock memory info for testing
 */
export function createMockMemory(overrides?: Partial<MemoryInfo>): MemoryInfo {
  return {
    total: 1099511627776, // 1TB
    available: 1030792151040,
    used: 68719476736,
    free: 1030792151040,
    shared: 0,
    cached: 0,
    buffers: 0,
    swapTotal: 0,
    swapFree: 0,
    swapUsed: 0,
    ...overrides,
  };
}

/**
 * Create mock storage info for testing
 */
export function createMockStorage(overrides?: Partial<Storage>): Storage {
  return {
    blockDevices: [
      {
        name: '/dev/nvme0n1',
        type: 'nvme',
        size: 3840755982336, // 3.5TB
        model: 'Samsung SSD 980 PRO 4TB',
        serial: 'S5GXNX0T123456',
        mountpoint: '/',
        fstype: 'ext4',
      },
    ],
    mountPoints: [
      {
        device: '/dev/nvme0n1p2',
        mountpoint: '/',
        fstype: 'ext4',
        size: 3840755982336,
        used: 1073741824000,
        available: 2767014158336,
        usedPercent: 27.9,
      },
    ],
    totalCapacity: 3840755982336,
    totalUsed: 1073741824000,
    totalAvailable: 2767014158336,
    ...overrides,
  };
}

/**
 * Create mock network info for testing
 */
export function createMockNetwork(overrides?: Partial<Network>): Network {
  return {
    interfaces: [
      {
        name: 'enp1s0f0',
        type: 'ethernet',
        speed: 100000, // 100Gbps
        mtu: 9000,
        state: 'up',
        mac: '00:1a:2b:3c:4d:5e',
        ipv4: ['10.0.0.100'],
        ipv6: ['fe80::21a:2bff:fe3c:4d5e'],
      },
      {
        name: 'ib0',
        type: 'infiniband',
        speed: 200000, // 200Gbps
        mtu: 4092,
        state: 'up',
        mac: '00:02:c9:01:23:45',
        ipv4: ['192.168.1.100'],
        ipv6: ['fe80::202:c9ff:fe01:2345'],
      },
    ],
    totalInterfaces: 2,
    activeInterfaces: 2,
    ...overrides,
  };
}

interface MockHardwareTopology {
  gpus: GPU[];
  cpu: CPU;
  memory: MemoryInfo;
  storage: Storage;
  network: Network;
  timestamp: string;
}

/**
 * Create a complete mock hardware topology
 */
export function createMockHardwareTopology(): MockHardwareTopology {
  return {
    gpus: [
      createMockGPU({ id: 0 }),
      createMockGPU({ id: 1, uuid: 'GPU-12345678-1234-1234-1234-123456789013' }),
      createMockGPU({ id: 2, uuid: 'GPU-12345678-1234-1234-1234-123456789014' }),
      createMockGPU({ id: 3, uuid: 'GPU-12345678-1234-1234-1234-123456789015' }),
    ],
    cpu: createMockCPU(),
    memory: createMockMemory(),
    storage: createMockStorage(),
    network: createMockNetwork(),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Condition not met within ${timeout}ms`);
}

interface CallRecord<T extends (...args: unknown[]) => unknown> {
  args: Parameters<T>;
  result?: ReturnType<T>;
  error?: Error;
}

interface CallTracker<T extends (...args: unknown[]) => unknown> {
  fn: T;
  calls: CallRecord<T>[];
  callCount: () => number;
  lastCall: () => CallRecord<T> | undefined;
  reset: () => void;
}

/**
 * Create a spy that tracks calls
 */
export function createCallTracker<T extends (...args: unknown[]) => unknown>(): CallTracker<T> {
  const calls: CallRecord<T>[] = [];

  return {
    fn: ((...args: Parameters<T>) => {
      const call: CallRecord<T> = { args };
      calls.push(call);
      return call.result;
    }) as T,
    calls,
    callCount: () => calls.length,
    lastCall: () => calls[calls.length - 1],
    reset: () => calls.splice(0, calls.length),
  };
}
