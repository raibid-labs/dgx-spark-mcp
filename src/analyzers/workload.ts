/**
 * Workload analyzer for Spark jobs
 */

import {
  WorkloadCharacteristics,
  WorkloadAnalysisRequest,
  WorkloadClassificationResult,
  WorkloadPattern,
  ComputeIntensity,
  IOPattern,
  GPUUtilization,
  ShuffleIntensity,
  HistoricalWorkloadMetrics,
} from '../types/workload.js';
import { WorkloadType } from '../types/spark-config.js';
import { parseSize } from '../optimizers/memory.js';

/**
 * Workload patterns for classification
 */
const WORKLOAD_PATTERNS: WorkloadPattern[] = [
  {
    name: 'ML Training',
    description: 'Machine learning model training workload',
    indicators: [
      'train',
      'training',
      'fit',
      'model',
      'neural',
      'deep learning',
      'tensorflow',
      'pytorch',
      'xgboost',
      'gradient',
      'epoch',
    ],
    recommendedType: 'ml-training',
    typicalCharacteristics: {
      type: 'ml-training',
      computeIntensity: 'very-high',
      ioPattern: 'sequential',
      gpuUtilization: 'high',
      shuffleIntensity: 'light',
    },
  },
  {
    name: 'ML Inference',
    description: 'Machine learning model inference/prediction',
    indicators: [
      'predict',
      'inference',
      'score',
      'evaluate',
      'classify',
      'detect',
      'batch prediction',
    ],
    recommendedType: 'ml-inference',
    typicalCharacteristics: {
      type: 'ml-inference',
      computeIntensity: 'high',
      ioPattern: 'streaming',
      gpuUtilization: 'medium',
      shuffleIntensity: 'none',
    },
  },
  {
    name: 'ETL Pipeline',
    description: 'Extract, Transform, Load operations',
    indicators: [
      'etl',
      'extract',
      'transform',
      'load',
      'pipeline',
      'ingest',
      'parse',
      'clean',
      'deduplicate',
    ],
    recommendedType: 'etl',
    typicalCharacteristics: {
      type: 'etl',
      computeIntensity: 'medium',
      ioPattern: 'sequential',
      gpuUtilization: 'none',
      shuffleIntensity: 'moderate',
    },
  },
  {
    name: 'Analytics Query',
    description: 'Analytical queries and aggregations',
    indicators: [
      'aggregate',
      'group by',
      'analytics',
      'reporting',
      'dashboard',
      'query',
      'sql',
      'olap',
      'cube',
      'rollup',
    ],
    recommendedType: 'analytics',
    typicalCharacteristics: {
      type: 'analytics',
      computeIntensity: 'high',
      ioPattern: 'random',
      gpuUtilization: 'low',
      shuffleIntensity: 'heavy',
    },
  },
  {
    name: 'Streaming Processing',
    description: 'Real-time stream processing',
    indicators: [
      'stream',
      'streaming',
      'kafka',
      'kinesis',
      'real-time',
      'event',
      'micro-batch',
      'continuous',
    ],
    recommendedType: 'streaming',
    typicalCharacteristics: {
      type: 'streaming',
      computeIntensity: 'medium',
      ioPattern: 'streaming',
      gpuUtilization: 'none',
      shuffleIntensity: 'light',
    },
  },
  {
    name: 'Graph Processing',
    description: 'Graph algorithms and analysis',
    indicators: [
      'graph',
      'pagerank',
      'connected components',
      'shortest path',
      'vertex',
      'edge',
      'graphx',
      'network analysis',
    ],
    recommendedType: 'graph',
    typicalCharacteristics: {
      type: 'graph',
      computeIntensity: 'very-high',
      ioPattern: 'random',
      gpuUtilization: 'medium',
      shuffleIntensity: 'extreme',
    },
  },
];

/**
 * Classify workload based on description and metadata
 */
export async function classifyWorkload(
  descriptionOrRequest: string | WorkloadAnalysisRequest
): Promise<WorkloadClassificationResult> {
  const request: WorkloadAnalysisRequest =
    typeof descriptionOrRequest === 'string'
      ? { description: descriptionOrRequest }
      : descriptionOrRequest;

  // Extract all text for analysis
  const analysisText = [
    request.description,
    request.sqlQuery,
    request.codeSnippet,
    ...(request.operations ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Match against patterns
  const patternScores = WORKLOAD_PATTERNS.map((pattern) => {
    const matchCount = pattern.indicators.filter((indicator) =>
      analysisText.includes(indicator.toLowerCase())
    ).length;

    return {
      pattern,
      score: matchCount / pattern.indicators.length,
      matches: matchCount,
    };
  });

  // Get best match
  patternScores.sort((a, b) => b.score - a.score);
  const bestMatch = patternScores[0] ?? {
    pattern: WORKLOAD_PATTERNS[0],
    score: 0,
    matches: 0,
  };

  // console.log('DEBUG: classifyWorkload', { request, bestMatch, patternScores: patternScores.slice(0, 3) });

  // Determine workload type
  const workloadType: WorkloadType =
    bestMatch.score > 0.1 ? (bestMatch?.pattern?.recommendedType ?? 'mixed') : 'mixed';

  // Analyze data size
  let dataSize = 0;
  if (request.dataSize) {
    dataSize =
      typeof request.dataSize === 'number' ? request.dataSize : parseSize(request.dataSize);
  } else if (request.historicalMetrics?.previousDataSize) {
    dataSize = request.historicalMetrics.previousDataSize;
  }

  // Determine characteristics
  const computeIntensity = determineComputeIntensity(
    workloadType,
    request.operations,
    bestMatch.pattern?.typicalCharacteristics?.computeIntensity
  );

  const ioPattern = determineIOPattern(
    workloadType,
    request.operations,
    bestMatch.pattern?.typicalCharacteristics?.ioPattern
  );

  const gpuUtilization = determineGPUUtilization(
    workloadType,
    analysisText,
    bestMatch.pattern?.typicalCharacteristics?.gpuUtilization
  );

  const shuffleIntensity = determineShuffleIntensity(
    workloadType,
    request.historicalMetrics,
    request.operations,
    bestMatch.pattern?.typicalCharacteristics?.shuffleIntensity
  );

  const memoryFootprint = estimateMemoryFootprint(dataSize, workloadType, computeIntensity);

  const characteristics: WorkloadCharacteristics = {
    type: workloadType,
    dataSize,
    computeIntensity,
    ioPattern,
    gpuUtilization,
    memoryFootprint,
    shuffleIntensity,
    confidence: Math.min(bestMatch.score * 2, 1), // Scale confidence
  };

  // Generate resource recommendations
  const recommendedResources = recommendResources(characteristics);

  // Generate optimization hints
  const optimizationHints = generateOptimizationHints(characteristics, request.historicalMetrics);

  return {
    characteristics,
    recommendedResources,
    optimizationHints,
  };
}

/**
 * Analyze workload requirements based on type and size
 */
export async function analyzeWorkloadRequirements(request: {
  workloadType: WorkloadType;
  dataSize: string | number;
}): Promise<{
  estimatedCores: number;
  estimatedMemoryGB: number;
  estimatedExecutors: number;
  recommendGPU: boolean;
  estimatedDurationMinutes: number;
}> {
  const dataSize =
    typeof request.dataSize === 'string' ? parseSize(request.dataSize) : request.dataSize;
  const dataSizeGB = dataSize / 1024 ** 3;

  // Reuse recommendResources logic by mocking characteristics
  const characteristics: WorkloadCharacteristics = {
    type: request.workloadType,
    dataSize: dataSize,
    computeIntensity: 'medium', // default
    ioPattern: 'sequential',
    gpuUtilization: 'none',
    memoryFootprint: {
      estimatedPeakGB: dataSizeGB * 2, // rough estimate
      spillRisk: 'low',
    },
    shuffleIntensity: 'moderate',
    confidence: 1.0,
  };

  // Refine characteristics based on type
  if (request.workloadType === 'ml-training') {
    characteristics.gpuUtilization = 'high';
    characteristics.computeIntensity = 'very-high';
  } else if (request.workloadType === 'etl') {
    characteristics.gpuUtilization = 'none';
  } else if (request.workloadType === 'analytics') {
    characteristics.gpuUtilization = 'low';
  }

  const resources = recommendResources(characteristics);

  const recommendGPU = (resources.gpuCount ?? 0) > 0;

  const estimatedCores = resources.executorCount * resources.executorCores;
  const estimatedMemoryGB = resources.executorCount * resources.executorMemoryGB;

  // Simple duration estimate
  let throughputGBps = 0.1; // 100MB/s per core baseline
  if (recommendGPU) throughputGBps *= 3;

  const totalThroughput = throughputGBps * estimatedCores;
  // Duration in minutes
  const estimatedDurationMinutes = dataSizeGB / totalThroughput / 60;

  return {
    estimatedCores,
    estimatedMemoryGB,
    estimatedExecutors: resources.executorCount,
    recommendGPU,
    estimatedDurationMinutes: Math.max(1, estimatedDurationMinutes),
  };
}

/**
 * Predict GPU utilization for a workload
 */
export async function predictGPUUtilization(request: {
  workloadType: WorkloadType;
  modelSize?: string;
  dataSize?: string | number;
}): Promise<{
  utilization: GPUUtilization;
  percentage: number;
  recommendation: string;
}> {
  const workloadType = request.workloadType;

  let utilization: GPUUtilization;
  let percentage: number;
  let recommendation: string;

  switch (workloadType) {
    case 'ml-training':
      utilization = 'high';
      percentage = 85;
      recommendation = 'GPU highly recommended for ML training. Use RAPIDS for data preprocessing.';
      break;

    case 'ml-inference':
      utilization = 'medium';
      percentage = 60;
      recommendation = 'GPU beneficial for inference, especially for large batch sizes.';
      break;

    case 'analytics':
      utilization = 'low';
      percentage = 30;
      recommendation = 'GPU can accelerate SQL operations with RAPIDS. Test cost vs. benefit.';
      break;

    case 'etl':
      utilization = 'none';
      percentage = 10;
      recommendation =
        'GPU not typically beneficial for ETL. Consider for specific transformations.';
      break;

    default:
      utilization = 'none';
      percentage = 0;
      recommendation = 'GPU not recommended for this workload type.';
  }

  return { utilization, percentage, recommendation };
}

/**
 * Determine compute intensity
 */
function determineComputeIntensity(
  workloadType: WorkloadType,
  operations?: string[],
  defaultIntensity?: ComputeIntensity
): ComputeIntensity {
  if (defaultIntensity && !operations) {
    return defaultIntensity;
  }

  const computeHeavyOps = [
    'train',
    'fit',
    'aggregate',
    'join',
    'cartesian',
    'groupby',
    'reduce',
    'fold',
  ];

  const heavyOpCount =
    operations?.filter((op) => computeHeavyOps.some((heavy) => op.toLowerCase().includes(heavy)))
      .length ?? 0;

  if (workloadType === 'ml-training' || workloadType === 'graph') {
    return 'very-high';
  } else if (heavyOpCount > 3 || workloadType === 'analytics') {
    return 'high';
  } else if (heavyOpCount > 1) {
    return 'medium';
  }

  return 'low';
}

/**
 * Determine I/O pattern
 */
function determineIOPattern(
  workloadType: WorkloadType,
  operations?: string[],
  defaultPattern?: IOPattern
): IOPattern {
  if (defaultPattern && !operations) {
    return defaultPattern;
  }

  if (workloadType === 'streaming') {
    return 'streaming';
  }

  const randomOps = ['join', 'lookup', 'sample', 'random'];
  const hasRandomOps =
    operations?.some((op) => randomOps.some((random) => op.toLowerCase().includes(random))) ??
    false;

  if (hasRandomOps || workloadType === 'analytics' || workloadType === 'graph') {
    return 'random';
  }

  return 'sequential';
}

/**
 * Determine GPU utilization
 */
function determineGPUUtilization(
  workloadType: WorkloadType,
  analysisText: string,
  defaultUtilization?: GPUUtilization
): GPUUtilization {
  const gpuKeywords = ['gpu', 'cuda', 'rapids', 'tensor', 'deep learning', 'neural network'];

  const hasGPUKeywords = gpuKeywords.some((keyword) => analysisText.includes(keyword));

  if (hasGPUKeywords || workloadType === 'ml-training') {
    return 'high';
  } else if (workloadType === 'ml-inference' || workloadType === 'graph') {
    return 'medium';
  } else if (workloadType === 'analytics') {
    return 'low';
  }

  return defaultUtilization ?? 'none';
}

/**
 * Determine shuffle intensity
 */
function determineShuffleIntensity(
  workloadType: WorkloadType,
  historicalMetrics: HistoricalWorkloadMetrics | undefined,
  operations?: string[],
  defaultIntensity?: ShuffleIntensity
): ShuffleIntensity {
  // Use historical data if available
  if (historicalMetrics?.shuffleReadMB && historicalMetrics?.shuffleWriteMB) {
    const totalShuffleMB = historicalMetrics.shuffleReadMB + historicalMetrics.shuffleWriteMB;
    if (totalShuffleMB > 10000) return 'extreme';
    if (totalShuffleMB > 5000) return 'heavy';
    if (totalShuffleMB > 1000) return 'moderate';
    if (totalShuffleMB > 100) return 'light';
    return 'none';
  }

  const shuffleOps = ['join', 'groupby', 'aggregate', 'distinct', 'repartition', 'coalesce'];
  const shuffleOpCount =
    operations?.filter((op) => shuffleOps.some((shuffle) => op.toLowerCase().includes(shuffle)))
      .length ?? 0;

  if (workloadType === 'graph') return 'extreme';
  if (shuffleOpCount > 5 || workloadType === 'analytics') return 'heavy';
  if (shuffleOpCount > 2) return 'moderate';
  if (shuffleOpCount > 0) return 'light';

  return defaultIntensity ?? 'none';
}

/**
 * Estimate memory footprint
 */
function estimateMemoryFootprint(
  dataSize: number,
  workloadType: WorkloadType,
  computeIntensity: ComputeIntensity
): WorkloadCharacteristics['memoryFootprint'] {
  const dataSizeGB = dataSize / 1024 ** 3;

  // Memory multipliers based on workload
  let memoryMultiplier = 2.0;

  if (workloadType === 'ml-training') {
    memoryMultiplier = 4.0;
  } else if (computeIntensity === 'very-high') {
    memoryMultiplier = 3.5;
  } else if (computeIntensity === 'high') {
    memoryMultiplier = 3.0;
  } else if (workloadType === 'analytics') {
    memoryMultiplier = 2.5;
  }

  const estimatedPeakGB = dataSizeGB * memoryMultiplier;

  // Determine spill risk
  let spillRisk: 'low' | 'medium' | 'high';
  if (computeIntensity === 'very-high' || workloadType === 'ml-training') {
    spillRisk = 'high';
  } else if (computeIntensity === 'high') {
    spillRisk = 'medium';
  } else {
    spillRisk = 'low';
  }

  return {
    estimatedPeakGB,
    cacheRequirementGB: workloadType === 'analytics' ? dataSizeGB * 0.5 : undefined,
    spillRisk,
  };
}

/**
 * Recommend resources based on characteristics
 */
function recommendResources(
  characteristics: WorkloadCharacteristics
): WorkloadClassificationResult['recommendedResources'] {
  const dataSizeGB = characteristics.dataSize / 1024 ** 3;

  // Base recommendations
  let executorMemoryGB = Math.max(
    8,
    Math.ceil(characteristics.memoryFootprint.estimatedPeakGB / 4)
  );
  let executorCores = 5;
  let executorCount = 4;
  let gpuCount: number | undefined;

  // Adjust based on workload type
  switch (characteristics.type) {
    case 'ml-training':
      executorMemoryGB = Math.max(16, executorMemoryGB);
      executorCores = 8;
      gpuCount = Math.max(1, Math.ceil(dataSizeGB / 100));
      break;

    case 'ml-inference':
      executorCores = 4;
      gpuCount = Math.ceil(dataSizeGB / 200);
      break;

    case 'analytics':
      executorMemoryGB = Math.max(12, executorMemoryGB);
      executorCount = Math.max(4, Math.ceil(dataSizeGB / 50));
      break;

    case 'streaming':
      executorMemoryGB = Math.max(4, executorMemoryGB);
      executorCores = 4;
      executorCount = 2;
      break;

    case 'graph':
      executorMemoryGB = Math.max(16, executorMemoryGB);
      executorCount = Math.max(8, Math.ceil(dataSizeGB / 25));
      gpuCount = Math.ceil(executorCount / 4);
      break;
  }

  return {
    executorMemoryGB,
    executorCores,
    executorCount,
    gpuCount,
  };
}

/**
 * Generate optimization hints
 */
function generateOptimizationHints(
  characteristics: WorkloadCharacteristics,
  _historicalMetrics: HistoricalWorkloadMetrics | undefined
): string[] {
  const hints: string[] = [];

  // Shuffle optimization
  if (
    characteristics.shuffleIntensity === 'heavy' ||
    characteristics.shuffleIntensity === 'extreme'
  ) {
    hints.push(
      'High shuffle detected. Consider increasing shuffle partitions and enabling adaptive execution.'
    );
    hints.push('Use disk-based shuffle for large datasets to prevent OOM errors.');
  }

  // Memory optimization
  if (characteristics.memoryFootprint.spillRisk === 'high') {
    hints.push(
      `High memory pressure detected. Estimated peak: ${characteristics.memoryFootprint.estimatedPeakGB.toFixed(1)}GB.`
    );
    hints.push('Consider increasing executor memory or reducing partition sizes.');
  }

  // GPU optimization
  if (characteristics.gpuUtilization === 'high' || characteristics.gpuUtilization === 'medium') {
    hints.push('Workload can benefit from GPU acceleration. Consider using RAPIDS Spark.');
  }

  // I/O optimization
  if (characteristics.ioPattern === 'random') {
    hints.push(
      'Random I/O pattern detected. Ensure data is partitioned appropriately for optimal access.'
    );
  }

  // Compute optimization
  if (characteristics.computeIntensity === 'very-high') {
    hints.push(
      'Very high compute intensity. Maximize CPU cores per executor for better parallelism.'
    );
  }

  // Streaming-specific
  if (characteristics.type === 'streaming') {
    hints.push('For streaming workloads, tune trigger interval and checkpoint frequency.');
  }

  // Cache recommendations
  if (characteristics.memoryFootprint.cacheRequirementGB) {
    hints.push(
      `Consider caching intermediate results. Estimated cache requirement: ${characteristics.memoryFootprint.cacheRequirementGB.toFixed(1)}GB.`
    );
  }

  return hints;
}
