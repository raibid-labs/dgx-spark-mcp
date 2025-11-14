---
title: DGX Spark Performance Tuning Guide
description: Advanced performance tuning techniques for Apache Spark on NVIDIA DGX with GPU acceleration
category: tuning
tags: [spark, performance, tuning, optimization, gpu, rapids]
author: DGX-Spark MCP Team
dateCreated: 2025-11-14
version: 1.0.0
relatedDocs: [configuration, best-practices, troubleshooting]
---

# DGX Spark Performance Tuning Guide

This guide provides advanced performance tuning techniques to maximize Apache Spark performance on NVIDIA DGX systems with GPU acceleration.

## GPU Acceleration Tuning

### RAPIDS Plugin Optimization

#### Concurrent GPU Tasks

```properties
# Conservative (stable, lower throughput)
spark.rapids.sql.concurrentGpuTasks             1

# Balanced (recommended for most workloads)
spark.rapids.sql.concurrentGpuTasks             2

# Aggressive (high throughput, may OOM)
spark.rapids.sql.concurrentGpuTasks             4
```

**Rule of thumb**: `concurrentGpuTasks × taskGpuAmount ≤ 1.0`

#### GPU Memory Tuning

```properties
# Pinned memory pool (speeds up CPU-GPU transfers)
spark.rapids.memory.pinnedPool.size             8g    # A100 40GB
spark.rapids.memory.pinnedPool.size             16g   # A100 80GB

# GPU batch size
spark.rapids.sql.batchSizeBytes                 2147483647  # 2GB max

# Spill to disk when GPU memory full
spark.rapids.sql.gpuOomDumpDir                  /tmp/gpu-oom
```

#### Task-to-GPU Mapping

```bash
# Scenario 1: 8 GPUs, 64 cores
# Run 64 tasks, 8 concurrent (1 per GPU)
spark.task.resource.gpu.amount = 0.125  # 1/8

# Scenario 2: 8 GPUs, 128 cores
# Run 128 tasks, 16 concurrent (2 per GPU)
spark.task.resource.gpu.amount = 0.0625  # 1/16

# Scenario 3: Dedicated GPU per task (ML workloads)
spark.task.resource.gpu.amount = 1.0
```

### Operation Acceleration

#### Check GPU-Accelerated Operations

```scala
// Enable explain output
spark.conf.set("spark.rapids.sql.explain", "ALL")

// Run query
df.groupBy("category").sum("amount").explain()

// Look for "GpuColumnarToRow" and other Gpu* operators
```

#### Force GPU Execution

```properties
# Disable CPU fallback for specific operations
spark.rapids.sql.expression.Cast                true
spark.rapids.sql.expression.Add                 true
spark.rapids.sql.expression.Multiply            true

# Enable experimental features
spark.rapids.sql.incompatibleOps.enabled        true
spark.rapids.sql.incompatibleDateFormats.enabled true
```

### GPU Memory Management

#### Monitor GPU Memory

```bash
# Real-time monitoring
watch -n 1 nvidia-smi

# Spark UI: Check "GPU Memory" tab
# http://driver-node:4040/GPU
```

#### Prevent GPU OOM

```properties
# Reduce batch size
spark.rapids.sql.batchSizeBytes                 1073741824  # 1GB

# Reduce concurrent tasks
spark.rapids.sql.concurrentGpuTasks             1

# Enable spilling
spark.rapids.sql.enableCpuFallback              true
```

## Memory Optimization

### Executor Memory Sizing

#### Calculate Optimal Executor Size

```python
# DGX A100 with 2TB RAM, 8 GPUs
total_ram = 2048  # GB
system_reserved = 128  # GB
driver_memory = 64  # GB
num_executors = 8

executor_memory = (total_ram - system_reserved - driver_memory) / num_executors
# Result: ~232 GB per executor

# Account for overhead (15-20%)
executor_heap = executor_memory * 0.8  # 185 GB
executor_overhead = executor_memory * 0.2  # 47 GB
```

#### Configuration

```properties
spark.executor.memory                           185g
spark.executor.memoryOverhead                   47g
spark.executor.instances                        8
```

### Memory Fractions

#### Storage vs Execution Memory

```properties
# Default (balanced)
spark.memory.fraction                           0.6
spark.memory.storageFraction                    0.5

# Caching-heavy workloads
spark.memory.fraction                           0.7
spark.memory.storageFraction                    0.7

# Computation-heavy workloads
spark.memory.fraction                           0.6
spark.memory.storageFraction                    0.2
```

### Garbage Collection Tuning

#### G1GC (Recommended)

```bash
spark-submit \
  --conf "spark.executor.extraJavaOptions=-XX:+UseG1GC -XX:G1HeapRegionSize=32m -XX:InitiatingHeapOccupancyPercent=35 -XX:MaxGCPauseMillis=200" \
  your-app.jar
```

#### Monitor GC

```properties
# Enable GC logging
spark.executor.extraJavaOptions                 -verbose:gc -XX:+PrintGCDetails -XX:+PrintGCTimeStamps
```

## Shuffle Optimization

### Partition Count

#### Calculate Optimal Partitions

```python
# Rule: 128 MB - 1 GB per partition
data_size_gb = 1000  # 1 TB
partition_size_mb = 256  # Target size

optimal_partitions = (data_size_gb * 1024) / partition_size_mb
# Result: 4000 partitions

# Round to multiple of executors × cores
executors = 16
cores_per_executor = 8
total_cores = executors * cores_per_executor  # 128

# Round up to nearest multiple
partitions = ((optimal_partitions // total_cores) + 1) * total_cores
# Result: 4096 partitions
```

#### Configuration

```properties
spark.sql.shuffle.partitions                    4096
spark.default.parallelism                       4096
```

### Adaptive Query Execution (AQE)

#### Enable and Tune AQE

```properties
# Enable AQE
spark.sql.adaptive.enabled                      true

# Partition coalescing (combine small partitions)
spark.sql.adaptive.coalescePartitions.enabled   true
spark.sql.adaptive.coalescePartitions.minPartitionSize          1m
spark.sql.adaptive.advisoryPartitionSizeInBytes                 64m

# Skew join optimization
spark.sql.adaptive.skewJoin.enabled             true
spark.sql.adaptive.skewJoin.skewedPartitionFactor               5
spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes     256m

# Dynamic join strategy
spark.sql.adaptive.autoBroadcastJoinThreshold   100m
```

### RAPIDS Shuffle

#### UCX Shuffle Manager

```properties
# Enable UCX shuffle (for InfiniBand)
spark.shuffle.manager                           com.nvidia.spark.rapids.spark323.RapidsShuffleManager
spark.rapids.shuffle.mode                       UCX

# UCX configuration
spark.executorEnv.UCX_TLS                       rc,cuda_copy,cuda_ipc
spark.executorEnv.UCX_ERROR_SIGNALS             SIGILL,SIGBUS,SIGFPE
spark.rapids.shuffle.ucx.useWakeup              true
spark.rapids.shuffle.ucx.listenerStartPort      12345
```

#### Multithreaded Shuffle

```properties
# For non-InfiniBand systems
spark.rapids.shuffle.mode                       MULTITHREADED
spark.rapids.shuffle.multiThreaded.reader.threads       20
spark.rapids.shuffle.multiThreaded.writer.threads       20
```

## I/O Optimization

### File Format Selection

#### Parquet Tuning

```properties
# Compression
spark.sql.parquet.compression.codec             snappy  # Fast
# or
spark.sql.parquet.compression.codec             zstd    # Better compression

# Row group size
spark.sql.parquet.block.size                    268435456  # 256 MB

# Page size
spark.sql.parquet.page.size                     1048576    # 1 MB

# Vectorized reading
spark.sql.parquet.enableVectorizedReader        true

# RAPIDS GPU reading
spark.rapids.sql.format.parquet.enabled         true
spark.rapids.sql.format.parquet.read.enabled    true
```

#### ORC Tuning

```properties
spark.sql.orc.compression.codec                 snappy
spark.sql.orc.stripe.size                       67108864   # 64 MB
spark.sql.orc.enableVectorizedReader            true
```

### Caching Strategies

#### Smart Caching

```scala
// Cache intermediate results
val filtered = df.filter($"amount" > 100).cache()
filtered.count()  // Trigger caching

// Persist with specific storage level
df.persist(StorageLevel.MEMORY_AND_DISK_SER)

// Unpersist when done
filtered.unpersist()
```

#### GPU Caching

```scala
// Cache on GPU (RAPIDS)
import org.apache.spark.sql.rapids.GpuShuffleEnv

df.cache()  // Automatically uses GPU memory when available
```

### Broadcast Optimization

#### Broadcast Join Threshold

```properties
# Increase for more broadcast joins
spark.sql.autoBroadcastJoinThreshold            200m  # Default: 10m

# Disable broadcast for very large dimensions
spark.sql.autoBroadcastJoinThreshold            -1
```

#### Manual Broadcast

```scala
import org.apache.spark.sql.functions.broadcast

// Force broadcast of small table
val result = largeDf.join(broadcast(smallDf), "key")
```

## Network Optimization

### RDMA/InfiniBand Tuning

```properties
# UCX network stack
spark.executorEnv.UCX_NET_DEVICES               mlx5_0:1
spark.executorEnv.UCX_IB_GPU_DIRECT_RDMA        yes
spark.executorEnv.UCX_MEMTYPE_CACHE             n

# Increase network buffers
spark.network.maxRemoteBlockSizeFetchToMem      1g
spark.reducer.maxSizeInFlight                   96m
```

### Connection Pooling

```properties
# Increase connection pool
spark.rpc.numRetries                            5
spark.shuffle.io.numConnectionsPerPeer          2
spark.shuffle.io.maxRetries                     5
```

## Query Optimization

### Join Optimization

#### Sort-Merge Join

```properties
# Prefer sort-merge for large-large joins
spark.sql.join.preferSortMergeJoin              true
spark.sql.sortMergeJoin.exec.buffer.size        4m
```

#### Broadcast Hash Join

```scala
// For small-large joins, ensure broadcast
df1.join(broadcast(df2), "key")
```

### Predicate Pushdown

```scala
// Good: Filter pushed to Parquet reader
spark.read.parquet("data.parquet")
  .filter($"date" >= "2024-01-01")
  .select("id", "amount")

// Bad: Full table scan then filter
val df = spark.read.parquet("data.parquet")
val filtered = df.select("*").filter($"date" >= "2024-01-01")
```

### Column Pruning

```scala
// Good: Read only needed columns
df.select("id", "name", "amount")

// Bad: Read all columns
df.select("*").drop("unnecessary_col1", "unnecessary_col2")
```

## Monitoring and Profiling

### Spark UI Metrics

Key metrics to monitor:
- Task duration distribution
- Shuffle read/write sizes
- GC time percentage
- GPU utilization
- Memory usage

### RAPIDS Profiling

```bash
# Enable RAPIDS profiling
spark-submit \
  --conf spark.rapids.sql.metrics.level=DEBUG \
  --conf spark.rapids.sql.explain=ALL \
  your-app.jar
```

### System Monitoring

```bash
# GPU monitoring
nvidia-smi dmon -s pucvmet

# CPU/Memory monitoring
dstat -tcnmdgy 1

# Network monitoring (InfiniBand)
ibstat
```

## Performance Benchmarks

### Target Metrics (DGX A100)

#### ETL Workloads
- **Parquet read**: 20-40 GB/s per GPU
- **Filter/Project**: 100-200 GB/s per GPU
- **Join**: 30-60 GB/s per GPU
- **Aggregation**: 40-80 GB/s per GPU

#### ML Workloads
- **XGBoost training**: 5-10x CPU speedup
- **Feature engineering**: 10-50x CPU speedup

### Benchmarking Commands

```bash
# TPC-DS Benchmark
spark-submit \
  --class com.nvidia.spark.rapids.tests.tpcds.TpcdsLikeBench \
  --conf spark.rapids.sql.enabled=true \
  rapids-4-spark-tests.jar \
  --data /data/tpcds-1tb

# Mortgage Dataset
spark-submit \
  --class com.nvidia.spark.rapids.tests.mortgage.MortgageETL \
  rapids-4-spark-tests.jar \
  /data/mortgage
```

## Tuning Checklist

- [ ] GPU memory pools configured
- [ ] Executor memory sized correctly
- [ ] Partition count optimized
- [ ] AQE enabled
- [ ] Broadcast threshold tuned
- [ ] File format optimized (Parquet/ORC)
- [ ] Shuffle manager selected (UCX/Multithreaded)
- [ ] GC tuned (G1GC)
- [ ] Network settings configured
- [ ] Monitoring enabled

## Common Pitfalls

1. **Too many small partitions**: Increases overhead
2. **Too few large partitions**: Causes stragglers
3. **Insufficient GPU memory**: Leads to fallback to CPU
4. **Over-caching**: Wastes memory
5. **Skipped predicate pushdown**: Full table scans
6. **Broadcasting large tables**: Driver OOM
7. **Neglecting data skew**: Slow tasks

## Next Steps

- [Best Practices Guide](best-practices.md) - Production recommendations
- [Troubleshooting Guide](troubleshooting.md) - Debug performance issues
- [Examples](examples.md) - Real-world optimization examples

## References

- [Spark Performance Tuning](https://spark.apache.org/docs/latest/tuning.html)
- [RAPIDS Tuning Guide](https://nvidia.github.io/spark-rapids/docs/tuning-guide.html)
- [DGX Performance Optimization](https://docs.nvidia.com/dgx/best-practices/)
