---
title: DGX Spark Configuration Guide
description: Comprehensive configuration guide for Apache Spark on NVIDIA DGX systems
category: configuration
tags: [spark, configuration, dgx, settings, optimization]
author: DGX-Spark MCP Team
dateCreated: 2025-11-14
version: 1.0.0
relatedDocs: [installation, tuning, best-practices]
---

# DGX Spark Configuration Guide

This guide covers essential configuration settings for running Apache Spark optimally on NVIDIA DGX systems with GPU acceleration.

## Configuration Files

### Main Configuration Files

- `$SPARK_HOME/conf/spark-defaults.conf` - Default Spark properties
- `$SPARK_HOME/conf/spark-env.sh` - Environment variables
- `$SPARK_HOME/conf/log4j2.properties` - Logging configuration
- `$SPARK_HOME/conf/workers` - Cluster worker nodes

### Configuration Hierarchy

Configuration priority (highest to lowest):
1. SparkConf in application code
2. Command-line flags (--conf)
3. spark-defaults.conf
4. Environment variables

## GPU Configuration

### RAPIDS Accelerator Settings

```properties
# Enable RAPIDS SQL Plugin
spark.plugins                                   com.nvidia.spark.SQLPlugin
spark.rapids.sql.enabled                        true

# GPU Resource Allocation
spark.executor.resource.gpu.amount              1
spark.task.resource.gpu.amount                  0.125
spark.executor.resource.gpu.discoveryScript     /opt/spark/getGpusResources.sh

# RAPIDS SQL Configuration
spark.rapids.sql.concurrentGpuTasks             2
spark.rapids.sql.explain                        NOT_ON_GPU
spark.rapids.sql.incompatibleOps.enabled        false

# Memory Management
spark.rapids.memory.pinnedPool.size             8g
spark.rapids.sql.batchSizeBytes                 2147483647
```

### GPU Task Scheduling

```properties
# Fine-grained GPU sharing
spark.task.resource.gpu.amount                  0.125  # 8 tasks per GPU

# Coarse-grained (1 task per GPU)
spark.task.resource.gpu.amount                  1.0

# Medium-grained (2 tasks per GPU)
spark.task.resource.gpu.amount                  0.5
```

## Memory Configuration

### Executor Memory Settings

For DGX A100 (80GB GPU, 2TB RAM):

```properties
# Executor Memory
spark.executor.memory                           128g
spark.driver.memory                             64g

# Memory Overhead (for off-heap, network buffers, etc.)
spark.executor.memoryOverhead                   32g
spark.driver.memoryOverhead                     16g

# On-heap memory fractions
spark.memory.fraction                           0.6
spark.memory.storageFraction                    0.5
```

### Off-Heap Memory

```properties
# Enable off-heap memory
spark.memory.offHeap.enabled                    true
spark.memory.offHeap.size                       32g

# For GPU operations
spark.rapids.memory.pinnedPool.size             16g
```

### Memory Tuning Guidelines

- **Total Executor Memory** = executor.memory + executor.memoryOverhead
- **Per GPU**: Allocate 1-2GB RAM per 1GB GPU memory
- **Driver Memory**: 1/2 to 1/4 of executor memory
- **Storage Fraction**: 0.3-0.5 for caching-heavy workloads

## CPU Configuration

### Core Allocation

```properties
# Cores per executor
spark.executor.cores                            8

# Total executor instances (for YARN/K8s)
spark.executor.instances                        16

# Dynamic allocation
spark.dynamicAllocation.enabled                 true
spark.dynamicAllocation.minExecutors            4
spark.dynamicAllocation.maxExecutors            32
spark.dynamicAllocation.initialExecutors        8
```

### CPU Guidelines for DGX A100

- 128 CPU cores total
- Recommend 8-16 cores per executor
- Leave 8-16 cores for system/driver
- Total executors = (Total Cores - System Cores) / Cores per Executor

## Storage Configuration

### Shuffle Configuration

```properties
# Shuffle partitions
spark.sql.shuffle.partitions                    400
spark.sql.adaptive.shuffle.targetPostShuffleInputSize   134217728  # 128MB

# Shuffle behavior
spark.shuffle.service.enabled                   true
spark.shuffle.compress                          true
spark.shuffle.spill.compress                    true

# RAPIDS shuffle
spark.rapids.shuffle.mode                       MULTITHREADED
spark.rapids.shuffle.multiThreaded.reader.threads       20
spark.rapids.shuffle.multiThreaded.writer.threads       20
```

### Storage Levels

```properties
# Default storage level
spark.storage.level                             MEMORY_AND_DISK_SER

# Replication
spark.storage.replication                       2

# Cleanup
spark.cleaner.ttl                               3600
```

### Local Directories

```properties
# Use NVMe drives for temp data
spark.local.dir                                 /mnt/nvme0/spark-temp,/mnt/nvme1/spark-temp

# I/O encryption (optional)
spark.io.encryption.enabled                     false
```

## Network Configuration

### Basic Network Settings

```properties
# Timeouts
spark.network.timeout                           800s
spark.executor.heartbeatInterval                60s
spark.rpc.askTimeout                            600s

# Connection settings
spark.rpc.numRetries                            5
spark.rpc.retry.wait                            5s

# Network buffer
spark.network.maxRemoteBlockSizeFetchToMem      512m
```

### High-Performance Networking (InfiniBand)

```properties
# Enable RDMA for shuffle
spark.shuffle.io.preferDirectBufs               true
spark.shuffle.io.numConnectionsPerPeer          2

# UCX settings (for InfiniBand)
spark.executorEnv.UCX_TLS                       rc,cuda_copy,cuda_ipc
spark.executorEnv.UCX_MEMTYPE_CACHE             n
```

## Parallelism Configuration

### Default Parallelism

```properties
# Default parallelism (2-3x total cores)
spark.default.parallelism                       256

# SQL shuffle partitions
spark.sql.shuffle.partitions                    400

# Adaptive Query Execution
spark.sql.adaptive.enabled                      true
spark.sql.adaptive.coalescePartitions.enabled   true
spark.sql.adaptive.skewJoin.enabled             true
```

### Partition Size Guidelines

- **Small partitions**: < 100MB - Increase parallelism
- **Optimal**: 128MB - 1GB per partition
- **Large partitions**: > 2GB - Decrease parallelism

## Catalyst Optimizer Settings

### Query Optimization

```properties
# Broadcast join threshold
spark.sql.autoBroadcastJoinThreshold            100m

# File scan parallelism
spark.sql.files.maxPartitionBytes               134217728  # 128MB
spark.sql.files.openCostInBytes                 4194304    # 4MB

# Bucketing
spark.sql.sources.bucketing.enabled             true
spark.sql.sources.bucketing.autoBucketedScan.enabled    true
```

### Adaptive Query Execution (AQE)

```properties
# Enable AQE
spark.sql.adaptive.enabled                      true

# Coalesce partitions
spark.sql.adaptive.coalescePartitions.enabled   true
spark.sql.adaptive.coalescePartitions.minPartitionSize  1m
spark.sql.adaptive.advisoryPartitionSizeInBytes 64m

# Skew join optimization
spark.sql.adaptive.skewJoin.enabled             true
spark.sql.adaptive.skewJoin.skewedPartitionFactor       5
spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes  256m
```

## Logging Configuration

### Log Levels

Edit `conf/log4j2.properties`:

```properties
# Root logger level
rootLogger.level = INFO

# Reduce verbosity for specific packages
logger.spark.name = org.apache.spark
logger.spark.level = WARN

logger.rapids.name = com.nvidia.spark.rapids
logger.rapids.level = INFO

# Event logging
spark.eventLog.enabled                          true
spark.eventLog.dir                              /opt/spark/logs/events
spark.eventLog.compress                         true
```

## Security Configuration

### Authentication

```properties
# Enable authentication
spark.authenticate                              true
spark.authenticate.secret                       <secret-key>

# SSL/TLS
spark.ssl.enabled                               true
spark.ssl.keyStore                              /path/to/keystore
spark.ssl.keyStorePassword                      <password>
```

### Encryption

```properties
# Network encryption
spark.network.crypto.enabled                    true
spark.network.crypto.saslFallback               false

# Local storage encryption
spark.io.encryption.enabled                     true
```

## Environment Variables

Edit `conf/spark-env.sh`:

```bash
#!/usr/bin/env bash

# Java options
export SPARK_MASTER_OPTS="-Dspark.deploy.defaultCores=8"
export SPARK_WORKER_OPTS="-Dspark.worker.cleanup.enabled=true"

# Memory settings
export SPARK_WORKER_MEMORY=512g
export SPARK_DRIVER_MEMORY=64g

# GPU settings
export CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7

# Logging
export SPARK_LOG_DIR=/var/log/spark
export SPARK_PID_DIR=/var/run/spark

# Python
export PYSPARK_PYTHON=/usr/bin/python3
export PYSPARK_DRIVER_PYTHON=/usr/bin/python3
```

## Application-Specific Configuration

### Batch Processing

```properties
spark.executor.memory                           128g
spark.executor.cores                            16
spark.sql.shuffle.partitions                    800
spark.default.parallelism                       800
spark.rapids.sql.concurrentGpuTasks             4
```

### Streaming

```properties
spark.executor.memory                           64g
spark.executor.cores                            8
spark.streaming.backpressure.enabled            true
spark.streaming.receiver.maxRate                10000
spark.streaming.kafka.maxRatePerPartition       10000
```

### Machine Learning

```properties
spark.executor.memory                           256g
spark.executor.cores                            32
spark.rapids.ml.uvm.enabled                     true
spark.rapids.sql.enabled                        true
spark.task.resource.gpu.amount                  0.25
```

## Configuration Templates

### Template 1: Development (Single Node)

```properties
spark.master                                    local[*]
spark.driver.memory                             32g
spark.executor.memory                           64g
spark.rapids.sql.enabled                        true
spark.executor.resource.gpu.amount              1
```

### Template 2: Production Cluster

```properties
spark.master                                    spark://dgx-master:7077
spark.executor.instances                        16
spark.executor.memory                           128g
spark.executor.cores                            16
spark.executor.resource.gpu.amount              1
spark.rapids.sql.enabled                        true
spark.dynamicAllocation.enabled                 true
```

### Template 3: Kubernetes

```properties
spark.master                                    k8s://https://kubernetes.default.svc:443
spark.kubernetes.container.image                nvcr.io/nvidia/spark:24.08
spark.kubernetes.namespace                      spark
spark.executor.instances                        32
spark.kubernetes.executor.request.cores         8
spark.kubernetes.executor.limit.cores           16
```

## Validation

### Test Configuration

```bash
# Validate configuration
spark-submit \
  --master local[*] \
  --conf spark.rapids.sql.enabled=true \
  --conf spark.executor.resource.gpu.amount=1 \
  --dry-run \
  --class org.apache.spark.examples.SparkPi \
  $SPARK_HOME/examples/jars/spark-examples*.jar
```

### Monitor Configuration

```bash
# Check active configuration
spark-shell --conf spark.rapids.sql.enabled=true

scala> spark.conf.getAll.foreach(println)
```

## Next Steps

- [Performance Tuning Guide](tuning.md) - Advanced optimization techniques
- [Troubleshooting Guide](troubleshooting.md) - Common issues and solutions
- [Best Practices](best-practices.md) - Production recommendations

## References

- [Spark Configuration Documentation](https://spark.apache.org/docs/latest/configuration.html)
- [RAPIDS Accelerator Configuration](https://nvidia.github.io/spark-rapids/docs/configs.html)
- [DGX Best Practices](https://docs.nvidia.com/dgx/best-practices/)
