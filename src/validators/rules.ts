/**
 * Validation rules for Spark configurations
 */

/**
 * Spark configuration structure for validation
 */
interface SparkValidationConfig {
  executor?: {
    memory?: string;
    cores?: number;
    instances?: number;
  };
  driver?: {
    memory?: string;
    cores?: number;
  };
  memory?: {
    fraction?: number;
    storageFraction?: number;
    offHeap?: {
      enabled?: boolean;
      memory?: string;
    };
  };
  shuffle?: {
    partitions?: number;
    compress?: boolean;
  };
  gpu?: {
    enabled?: boolean;
    amount?: number;
    rapids?: {
      enabled?: boolean;
      memoryFraction?: number;
    };
  };
  optimization?: {
    adaptiveExecution?: {
      enabled?: boolean;
    };
  };
  speculation?: {
    enabled?: boolean;
  };
  serializer?: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  category: 'executor' | 'driver' | 'memory' | 'shuffle' | 'gpu' | 'optimization';
  severity: 'error' | 'warning' | 'info';
  description: string;
  check: (config: Record<string, unknown>) => boolean;
  message: (config: Record<string, unknown>) => string;
  fix?: (config: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Get all validation rules
 */
export async function listRules(): Promise<ValidationRule[]> {
  return ALL_RULES;
}

/**
 * Get rules by category
 */
export async function getRulesByCategory(category: string): Promise<ValidationRule[]> {
  return ALL_RULES.filter((rule) => rule.category === category);
}

/**
 * Get rules by severity
 */
export async function getRulesBySeverity(severity: string): Promise<ValidationRule[]> {
  return ALL_RULES.filter((rule) => rule.severity === severity);
}

/**
 * All validation rules
 */
const ALL_RULES: ValidationRule[] = [
  // Executor Rules
  {
    id: 'exec-001',
    name: 'Minimum Executor Memory',
    category: 'executor',
    severity: 'error',
    description: 'Executor memory must be at least 1GB',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      return parseMemory(cfg.executor?.memory) >= 1;
    },
    message: (config) => {
      const cfg = config as SparkValidationConfig;
      return `Executor memory ${cfg.executor?.memory} is below minimum of 1GB`;
    },
  },
  {
    id: 'exec-002',
    name: 'Maximum Executor Memory',
    category: 'executor',
    severity: 'warning',
    description: 'Executor memory should not exceed 64GB to avoid GC issues',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      return parseMemory(cfg.executor?.memory) <= 64;
    },
    message: (config) => {
      const cfg = config as SparkValidationConfig;
      return `Executor memory ${cfg.executor?.memory} exceeds recommended 64GB`;
    },
  },
  {
    id: 'exec-003',
    name: 'Executor Cores Range',
    category: 'executor',
    severity: 'warning',
    description: 'Executor cores should be between 4-6 for optimal performance',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      const cores = cfg.executor?.cores ?? 0;
      return cores >= 4 && cores <= 6;
    },
    message: (config) => {
      const cfg = config as SparkValidationConfig;
      return `Executor cores ${cfg.executor?.cores} outside optimal range of 4-6`;
    },
  },
  {
    id: 'exec-004',
    name: 'Minimum Executor Cores',
    category: 'executor',
    severity: 'error',
    description: 'Executor must have at least 1 core',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      const cores = cfg.executor?.cores ?? 0;
      return cores >= 1;
    },
    message: () => 'Executor cores must be at least 1',
  },

  // Driver Rules
  {
    id: 'drv-001',
    name: 'Minimum Driver Memory',
    category: 'driver',
    severity: 'error',
    description: 'Driver memory must be at least 1GB',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      return parseMemory(cfg.driver?.memory) >= 1;
    },
    message: (config) => {
      const cfg = config as SparkValidationConfig;
      return `Driver memory ${cfg.driver?.memory} is below minimum of 1GB`;
    },
  },
  {
    id: 'drv-002',
    name: 'Driver Memory Proportion',
    category: 'driver',
    severity: 'warning',
    description: 'Driver memory should be 1-2x executor memory',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      const driverMem = parseMemory(cfg.driver?.memory);
      const executorMem = parseMemory(cfg.executor?.memory);
      return driverMem >= executorMem && driverMem <= executorMem * 2;
    },
    message: (config) => {
      const cfg = config as SparkValidationConfig;
      const driverMem = parseMemory(cfg.driver?.memory);
      const executorMem = parseMemory(cfg.executor?.memory);
      return `Driver memory (${driverMem}GB) should be 1-2x executor memory (${executorMem}GB)`;
    },
  },

  // Memory Rules
  {
    id: 'mem-001',
    name: 'Memory Fraction Range',
    category: 'memory',
    severity: 'error',
    description: 'Memory fraction must be between 0 and 1',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      const fraction = cfg.memory?.fraction ?? -1;
      return fraction >= 0 && fraction <= 1;
    },
    message: (config) => {
      const cfg = config as SparkValidationConfig;
      return `Memory fraction ${cfg.memory?.fraction} must be between 0 and 1`;
    },
  },
  {
    id: 'mem-002',
    name: 'Storage Fraction Range',
    category: 'memory',
    severity: 'error',
    description: 'Storage fraction must be between 0 and 1',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      const storageFraction = cfg.memory?.storageFraction ?? -1;
      return storageFraction >= 0 && storageFraction <= 1;
    },
    message: (config) => {
      const cfg = config as SparkValidationConfig;
      return `Storage fraction ${cfg.memory?.storageFraction} must be between 0 and 1`;
    },
  },
  {
    id: 'mem-003',
    name: 'Recommended Memory Fraction',
    category: 'memory',
    severity: 'info',
    description: 'Memory fraction should be at least 0.4',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      const fraction = cfg.memory?.fraction ?? 0;
      return fraction >= 0.4;
    },
    message: (config) => {
      const cfg = config as SparkValidationConfig;
      return `Memory fraction ${cfg.memory?.fraction} is below recommended 0.4`;
    },
  },

  // Shuffle Rules
  {
    id: 'shuf-001',
    name: 'Minimum Shuffle Partitions',
    category: 'shuffle',
    severity: 'error',
    description: 'Shuffle partitions must be at least 1',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      const partitions = cfg.shuffle?.partitions ?? 0;
      return partitions >= 1;
    },
    message: () => 'Shuffle partitions must be at least 1',
  },
  {
    id: 'shuf-002',
    name: 'Shuffle Partitions vs Cores',
    category: 'shuffle',
    severity: 'warning',
    description: 'Shuffle partitions should be 2-3x total cores',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      const cores = cfg.executor?.cores ?? 0;
      const instances = cfg.executor?.instances ?? 1;
      const partitions = cfg.shuffle?.partitions ?? 0;
      const totalCores = cores * instances;
      return partitions >= totalCores * 2;
    },
    message: (config) => {
      const cfg = config as SparkValidationConfig;
      const cores = cfg.executor?.cores ?? 0;
      const instances = cfg.executor?.instances ?? 1;
      const totalCores = cores * instances;
      return `Shuffle partitions ${cfg.shuffle?.partitions} should be at least ${totalCores * 2} (2x cores)`;
    },
  },
  {
    id: 'shuf-003',
    name: 'Shuffle Compression',
    category: 'shuffle',
    severity: 'info',
    description: 'Shuffle compression should be enabled',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      return cfg.shuffle?.compress === true;
    },
    message: () => 'Enable shuffle compression to reduce I/O',
  },

  // GPU Rules
  {
    id: 'gpu-001',
    name: 'GPU Amount Positive',
    category: 'gpu',
    severity: 'error',
    description: 'GPU amount must be positive',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      if (!cfg.gpu?.enabled) return true;
      const amount = cfg.gpu?.amount ?? 1;
      return amount > 0;
    },
    message: (config) => {
      const cfg = config as SparkValidationConfig;
      return `GPU amount ${cfg.gpu?.amount} must be positive`;
    },
  },
  {
    id: 'gpu-002',
    name: 'RAPIDS Memory Fraction',
    category: 'gpu',
    severity: 'error',
    description: 'RAPIDS memory fraction must be between 0 and 1',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      if (!cfg.gpu?.rapids?.enabled) return true;
      const frac = cfg.gpu?.rapids?.memoryFraction;
      return frac === undefined || (frac >= 0 && frac <= 1);
    },
    message: (config) => {
      const cfg = config as SparkValidationConfig;
      return `RAPIDS memory fraction ${cfg.gpu?.rapids?.memoryFraction} must be between 0 and 1`;
    },
  },
  {
    id: 'gpu-003',
    name: 'RAPIDS Enabled with GPU',
    category: 'gpu',
    severity: 'info',
    description: 'Enable RAPIDS when using GPUs',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      if (!cfg.gpu?.enabled) return true;
      return cfg.gpu?.rapids?.enabled === true;
    },
    message: () => 'Enable RAPIDS for GPU-accelerated operations',
  },

  // Optimization Rules
  {
    id: 'opt-001',
    name: 'Kryo Serialization',
    category: 'optimization',
    severity: 'warning',
    description: 'Use Kryo serialization for better performance',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      return typeof cfg.serializer === 'string' && cfg.serializer.includes('Kryo');
    },
    message: () => 'Use Kryo serialization instead of Java serialization',
  },
  {
    id: 'opt-002',
    name: 'Adaptive Execution',
    category: 'optimization',
    severity: 'info',
    description: 'Enable Adaptive Query Execution',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      return cfg.optimization?.adaptiveExecution?.enabled === true;
    },
    message: () => 'Enable Adaptive Query Execution for runtime optimizations',
  },
  {
    id: 'opt-003',
    name: 'Off-Heap Memory',
    category: 'optimization',
    severity: 'info',
    description: 'Enable off-heap memory for large executors',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      const execMem = parseMemory(cfg.executor?.memory);
      return execMem < 16 || cfg.memory?.offHeap?.enabled === true;
    },
    message: () => 'Enable off-heap memory for executors with >16GB memory',
  },
  {
    id: 'opt-004',
    name: 'Speculation',
    category: 'optimization',
    severity: 'info',
    description: 'Enable speculation to handle slow tasks',
    check: (config) => {
      const cfg = config as SparkValidationConfig;
      return cfg.speculation?.enabled === true;
    },
    message: () => 'Enable speculation to mitigate stragglers',
  },
];

/**
 * Helper to parse memory
 */
function parseMemory(memory?: string): number {
  if (!memory) return 0;

  const match = memory.match(/^(\d+)([gmk])$/i);
  if (!match || !match[1] || !match[2]) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 'g':
      return value;
    case 'm':
      return value / 1024;
    case 'k':
      return value / (1024 * 1024);
    default:
      return value;
  }
}
