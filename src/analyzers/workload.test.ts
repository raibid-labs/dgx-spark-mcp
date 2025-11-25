/**
 * Unit tests for workload analyzer
 */

import { describe, it, expect } from '@jest/globals';
import { classifyWorkload, analyzeWorkloadRequirements } from './workload.js';

describe('Workload Analyzer', () => {
  describe('classifyWorkload', () => {
    it('should classify ML training workloads', async () => {
      const result = await classifyWorkload('Train a deep learning model');

      expect(result.characteristics.type).toBe('ml-training');
      expect(result.characteristics.confidence).toBeGreaterThan(0.5);
    });

    it('should classify ETL workloads', async () => {
      const result = await classifyWorkload(
        'Extract, transform and load ETL pipeline for customer data'
      );

      expect(result.characteristics.type).toBe('etl');
      expect(result.characteristics.confidence).toBeGreaterThan(0.5);
    });

    it('should classify analytics workloads', async () => {
      const result = await classifyWorkload(
        'Run analytics reporting and sql queries on sales data'
      );

      expect(result.characteristics.type).toBe('analytics');
      expect(result.characteristics.confidence).toBeGreaterThan(0.5);
    });

    it('should classify ML inference workloads', async () => {
      const result = await classifyWorkload('Run batch predictions and inference on new data');

      expect(result.characteristics.type).toBe('ml-inference');
      expect(result.characteristics.confidence).toBeGreaterThan(0.5);
    });

    it('should classify streaming workloads', async () => {
      const result = await classifyWorkload('Process real-time event stream via kafka');

      expect(result.characteristics.type).toBe('streaming');
      expect(result.characteristics.confidence).toBeGreaterThan(0.5);
    });

    it('should include detected characteristics', async () => {
      const result = await classifyWorkload('Train a transformer model on 1TB dataset');

      expect(result.characteristics).toBeDefined();
      expect(result.characteristics.gpuUtilization).toBeDefined();
      expect(result.characteristics.computeIntensity).toBeDefined();
    });

    it('should detect GPU requirements', async () => {
      const result = await classifyWorkload('Train neural network with GPU acceleration');

      expect(result.characteristics.gpuUtilization).not.toBe('none');
    });

    it('should detect high shuffle requirements', async () => {
      const result = await classifyWorkload('Graph processing with heavy shuffle');

      expect(result.characteristics.shuffleIntensity).not.toBe('none');
    });

    it('should handle ambiguous descriptions', async () => {
      const result = await classifyWorkload('Process some data');

      // Low confidence
      expect(result.characteristics.confidence).toBeLessThan(0.5);
    });
  });

  describe('analyzeWorkloadRequirements', () => {
    it('should analyze resource requirements', async () => {
      const result = await analyzeWorkloadRequirements({
        workloadType: 'ml-training',
        dataSize: '100GB',
      });

      expect(result).toHaveProperty('estimatedCores');
      expect(result).toHaveProperty('estimatedMemoryGB');
      expect(result).toHaveProperty('estimatedExecutors');
      expect(result.estimatedCores).toBeGreaterThan(0);
      expect(result.estimatedMemoryGB).toBeGreaterThan(0);
    });

    it('should recommend GPU for ML workloads', async () => {
      const result = await analyzeWorkloadRequirements({
        workloadType: 'ml-training',
        dataSize: '1TB',
      });

      expect(result.recommendGPU).toBe(true);
    });

    it('should not recommend GPU for ETL workloads', async () => {
      const result = await analyzeWorkloadRequirements({
        workloadType: 'etl',
        dataSize: '100GB',
      });

      expect(result.recommendGPU).toBe(false);
    });

    it('should scale resources with data size', async () => {
      const small = await analyzeWorkloadRequirements({
        workloadType: 'analytics',
        dataSize: '10GB',
      });

      const large = await analyzeWorkloadRequirements({
        workloadType: 'analytics',
        dataSize: '1TB',
      });

      expect(large.estimatedCores).toBeGreaterThan(small.estimatedCores);
      expect(large.estimatedMemoryGB).toBeGreaterThan(small.estimatedMemoryGB);
    });

    it('should provide execution time estimates', async () => {
      const result = await analyzeWorkloadRequirements({
        workloadType: 'ml-training',
        dataSize: '100GB',
      });

      expect(result.estimatedDurationMinutes).toBeDefined();
      expect(result.estimatedDurationMinutes).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty descriptions', async () => {
      const result = await classifyWorkload('');

      expect(result.characteristics.type).toBeDefined();
      expect(result.characteristics.confidence).toBeLessThan(0.5);
    });

    it('should handle very long descriptions', async () => {
      const longDesc = 'Train '.repeat(100) + 'a model';
      const result = await classifyWorkload(longDesc);

      expect(result.characteristics.type).toBe('ml-training');
    });

    it('should handle special characters', async () => {
      const result = await classifyWorkload('ML/DL training @ 100% GPU!');

      expect(result.characteristics.type).toBe('ml-training');
    });

    it('should handle very small data sizes', async () => {
      const result = await analyzeWorkloadRequirements({
        workloadType: 'analytics',
        dataSize: '1MB',
      });

      expect(result.estimatedCores).toBeGreaterThan(0);
      expect(result.estimatedMemoryGB).toBeGreaterThan(0);
    });

    it('should handle very large data sizes', async () => {
      const result = await analyzeWorkloadRequirements({
        workloadType: 'analytics',
        dataSize: '100PB',
      });

      expect(result.estimatedCores).toBeGreaterThan(0);
      expect(result.estimatedMemoryGB).toBeGreaterThan(0);
    });
  });
});
