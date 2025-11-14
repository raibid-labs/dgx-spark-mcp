---
title: DGX Spark Troubleshooting Guide
description: Common issues and solutions for Apache Spark on NVIDIA DGX systems
category: troubleshooting
tags: [spark, troubleshooting, debugging, errors, dgx, rapids]
author: DGX-Spark MCP Team
dateCreated: 2025-11-14
version: 1.0.0
relatedDocs: [configuration, tuning, best-practices]
---

# DGX Spark Troubleshooting Guide

This guide covers common issues, errors, and their solutions when running Apache Spark on NVIDIA DGX systems with GPU acceleration.

## GPU Issues

### Issue: GPUs Not Detected

**Symptoms:**
```
WARN ResourceProfile: GPU resources couldn't be discovered
```

**Diagnosis:**
```bash
# Check NVIDIA driver
nvidia-smi

# Check CUDA
nvcc --version

# Check GPU discovery script
/opt/spark/getGpusResources.sh

# Check Spark config
spark-submit --conf spark.executor.resource.gpu.amount=1 --dry-run your-app.jar
```

**Solutions:**

1. **Install/Update NVIDIA Driver**
```bash
sudo apt install nvidia-driver-535
sudo reboot
```

2. **Fix Discovery Script**
```bash
cat > /opt/spark/getGpusResources.sh << 'EOF'
#!/bin/bash
nvidia-smi --query-gpu=index --format=csv,noheader | \
  awk '{print "{\"name\": \"gpu\", \"addresses\": [\""$1"\"]}"}'
EOF
chmod +x /opt/spark/getGpusResources.sh
```

3. **Set Discovery Script Path**
```properties
spark.executor.resource.gpu.discoveryScript=/opt/spark/getGpusResources.sh
```

### Issue: GPU Out of Memory (OOM)

**Symptoms:**
```
CUDA error: out of memory
Task failed with GpuOutOfMemoryError
```

**Diagnosis:**
```bash
# Monitor GPU memory during job
watch -n 0.5 nvidia-smi

# Check Spark logs
grep "GpuOutOfMemory" /var/log/spark/executor.log
```

**Solutions:**

1. **Reduce Concurrent GPU Tasks**
```properties
spark.rapids.sql.concurrentGpuTasks             1
```

2. **Reduce Batch Size**
```properties
spark.rapids.sql.batchSizeBytes                 1073741824  # 1GB
```

3. **Enable CPU Fallback**
```properties
spark.rapids.sql.enableCpuFallback              true
```

4. **Reduce Task GPU Amount**
```properties
# Allow more tasks per GPU
spark.task.resource.gpu.amount                  0.0625  # 16 tasks per GPU
```

5. **Increase Pinned Memory**
```properties
spark.rapids.memory.pinnedPool.size             16g
```

### Issue: RAPIDS Plugin Not Loading

**Symptoms:**
```
Plugin com.nvidia.spark.SQLPlugin failed to load
ClassNotFoundException: com.nvidia.spark.SQLPlugin
```

**Diagnosis:**
```bash
# Check JAR files
ls -la $SPARK_HOME/jars/rapids-4-spark*.jar
ls -la $SPARK_HOME/jars/cudf*.jar

# Check classpath
echo $SPARK_CLASSPATH
```

**Solutions:**

1. **Download RAPIDS JARs**
```bash
cd $SPARK_HOME/jars
wget https://repo1.maven.org/maven2/com/nvidia/rapids-4-spark_2.12/24.08.0/rapids-4-spark_2.12-24.08.0.jar
wget https://repo1.maven.org/maven2/ai/rapids/cudf/24.08.0/cudf-24.08.0-cuda12.jar
```

2. **Verify Configuration**
```properties
spark.plugins                                   com.nvidia.spark.SQLPlugin
spark.rapids.sql.enabled                        true
```

### Issue: CUDA Version Mismatch

**Symptoms:**
```
CUDA driver version is insufficient for CUDA runtime version
cudf requires CUDA 12.0 but found 11.8
```

**Diagnosis:**
```bash
# Check CUDA driver version
nvidia-smi | grep "CUDA Version"

# Check CUDA runtime version
nvcc --version
```

**Solutions:**

1. **Update NVIDIA Driver**
```bash
sudo apt install nvidia-driver-535  # Supports CUDA 12.0+
sudo reboot
```

2. **Use Matching cuDF JAR**
```bash
# For CUDA 11.x
wget https://repo1.maven.org/maven2/ai/rapids/cudf/24.08.0/cudf-24.08.0-cuda11.jar

# For CUDA 12.x
wget https://repo1.maven.org/maven2/ai/rapids/cudf/24.08.0/cudf-24.08.0-cuda12.jar
```

## Memory Issues

### Issue: Executor Out of Memory

**Symptoms:**
```
java.lang.OutOfMemoryError: Java heap space
Container killed by YARN for exceeding memory limits
```

**Diagnosis:**
```bash
# Check executor memory usage in Spark UI
# http://driver:4040/executors/

# Check logs
grep "OutOfMemoryError" /var/log/spark/executor.log
```

**Solutions:**

1. **Increase Executor Memory**
```properties
spark.executor.memory                           128g
spark.executor.memoryOverhead                   32g
```

2. **Tune Memory Fractions**
```properties
spark.memory.fraction                           0.6
spark.memory.storageFaction                     0.5
```

3. **Reduce Partition Size**
```properties
spark.sql.files.maxPartitionBytes               67108864  # 64MB
```

4. **Unpersist Unused DataFrames**
```scala
df.unpersist()
```

5. **Enable Spilling**
```properties
spark.memory.offHeap.enabled                    true
spark.memory.offHeap.size                       32g
```

### Issue: Driver Out of Memory

**Symptoms:**
```
Driver OutOfMemoryError
Exception in thread "main" java.lang.OutOfMemoryError
```

**Diagnosis:**
```bash
# Check broadcast size
grep "broadcast" /var/log/spark/driver.log

# Check collected data size
grep "collect" /var/log/spark/driver.log
```

**Solutions:**

1. **Increase Driver Memory**
```properties
spark.driver.memory                             64g
spark.driver.maxResultSize                      8g
```

2. **Reduce Broadcast Threshold**
```properties
spark.sql.autoBroadcastJoinThreshold            50m
```

3. **Avoid collect() on Large DataFrames**
```scala
// Bad
val data = hugeDf.collect()  // OOM

// Good
hugeDf.write.parquet("output")
```

4. **Use take() Instead of collect()**
```scala
// Limit results
val sample = df.take(1000)
```

### Issue: Garbage Collection Overhead

**Symptoms:**
```
java.lang.OutOfMemoryError: GC overhead limit exceeded
Tasks spending >90% time in GC
```

**Diagnosis:**
```bash
# Check GC time in Spark UI
# http://driver:4040/executors/

# Enable GC logging
spark-submit --conf spark.executor.extraJavaOptions="-verbose:gc -XX:+PrintGCDetails"
```

**Solutions:**

1. **Use G1GC**
```properties
spark.executor.extraJavaOptions=-XX:+UseG1GC -XX:G1HeapRegionSize=32m -XX:InitiatingHeapOccupancyPercent=35
```

2. **Increase Executor Memory**
```properties
spark.executor.memory                           192g
```

3. **Reduce Memory Pressure**
```scala
// Unpersist unused caches
df.unpersist()

// Use MEMORY_AND_DISK instead of MEMORY_ONLY
df.persist(StorageLevel.MEMORY_AND_DISK_SER)
```

4. **Serialize Cached Data**
```properties
spark.serializer                                org.apache.spark.serializer.KryoSerializer
```

## Performance Issues

### Issue: Slow Jobs

**Diagnosis:**
```bash
# Check Spark UI
# - Stage timeline
# - Task distribution
# - Shuffle read/write
# http://driver:4040/stages/

# Check for stragglers
# Look for tasks taking 10x median time
```

**Solutions:**

1. **Enable AQE**
```properties
spark.sql.adaptive.enabled                      true
spark.sql.adaptive.coalescePartitions.enabled   true
spark.sql.adaptive.skewJoin.enabled             true
```

2. **Optimize Partition Count**
```properties
# Too many partitions (>10k)
spark.sql.shuffle.partitions                    2000

# Too few partitions (<100)
spark.sql.shuffle.partitions                    800
```

3. **Use GPU Acceleration**
```properties
spark.rapids.sql.enabled                        true
spark.rapids.sql.explain                        ALL  # Check what's on GPU
```

4. **Fix Data Skew**
```scala
// Add salt to skewed keys
import org.apache.spark.sql.functions._

val salted = df.withColumn("salted_key", concat($"key", lit("_"), (rand() * 10).cast("int")))
```

### Issue: Data Skew

**Symptoms:**
```
Few tasks taking much longer than others
Shuffle read size highly uneven across tasks
Some executors idle while others busy
```

**Diagnosis:**
```bash
# Check task metrics in Spark UI
# Look for tasks with disproportionate shuffle reads

# Check skew in data
spark.sql("SELECT key, count(*) FROM table GROUP BY key ORDER BY count(*) DESC").show()
```

**Solutions:**

1. **Enable Skew Join Optimization**
```properties
spark.sql.adaptive.skewJoin.enabled             true
spark.sql.adaptive.skewJoin.skewedPartitionFactor   5
spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes  256m
```

2. **Salting Technique**
```scala
// For joins on skewed keys
val saltedLeft = left.withColumn("salt", (rand() * 10).cast("int"))
  .withColumn("join_key", concat($"key", lit("_"), $"salt"))

val saltedRight = right.withColumn("salt", explode(array((0 until 10).map(lit): _*)))
  .withColumn("join_key", concat($"key", lit("_"), $"salt"))

saltedLeft.join(saltedRight, "join_key")
```

3. **Broadcast Small Skewed Keys**
```scala
// Separate skewed keys and broadcast join them
val skewedKeys = Seq("key1", "key2", "key3")
val skewed = df.filter($"key".isin(skewedKeys: _*))
val normal = df.filter(!$"key".isin(skewedKeys: _*))

val result = normal.join(other, "key")
  .union(skewed.join(broadcast(other), "key"))
```

### Issue: Shuffle Spill

**Symptoms:**
```
Large shuffle spill to disk
Spill (memory) and Spill (disk) metrics high
```

**Diagnosis:**
```bash
# Check Spark UI
# http://driver:4040/stages/
# Look at "Shuffle Spill (Memory)" and "Shuffle Spill (Disk)"
```

**Solutions:**

1. **Increase Executor Memory**
```properties
spark.executor.memory                           192g
spark.memory.fraction                           0.7
```

2. **Reduce Partition Count**
```properties
# Larger partitions, less overhead
spark.sql.shuffle.partitions                    400
```

3. **Use External Shuffle Service**
```properties
spark.shuffle.service.enabled                   true
```

4. **Enable Compression**
```properties
spark.shuffle.compress                          true
spark.shuffle.spill.compress                    true
```

## Network Issues

### Issue: Connection Timeouts

**Symptoms:**
```
Timeout waiting for connection from pool
Lost connection to executor
```

**Diagnosis:**
```bash
# Check network connectivity
ping worker-node

# Check ports
telnet worker-node 7077
```

**Solutions:**

1. **Increase Timeouts**
```properties
spark.network.timeout                           800s
spark.executor.heartbeatInterval                60s
spark.rpc.askTimeout                            600s
```

2. **Check Firewall**
```bash
# Allow Spark ports
sudo ufw allow 7077
sudo ufw allow 4040
sudo ufw allow 6066
sudo ufw allow 8080-8081
```

3. **Increase Retries**
```properties
spark.rpc.numRetries                            5
spark.rpc.retry.wait                            5s
```

### Issue: InfiniBand/RDMA Not Working

**Symptoms:**
```
UCX  ERROR No matching memory domain
Failed to initialize UCX
```

**Diagnosis:**
```bash
# Check InfiniBand status
ibstat

# Check UCX
ucx_info -d
```

**Solutions:**

1. **Install UCX**
```bash
sudo apt install ucx
```

2. **Configure UCX**
```properties
spark.executorEnv.UCX_TLS                       rc,cuda_copy,cuda_ipc
spark.executorEnv.UCX_NET_DEVICES               mlx5_0:1
spark.executorEnv.LD_LIBRARY_PATH               /usr/lib/x86_64-linux-gnu/ucx
```

3. **Fallback to TCP**
```properties
# If InfiniBand not available
spark.rapids.shuffle.mode                       MULTITHREADED
```

## Application Issues

### Issue: Job Stuck/Hanging

**Symptoms:**
```
Job not progressing
Tasks stuck in "RUNNING" state
```

**Diagnosis:**
```bash
# Check Spark UI
# - Active stages
# - Running tasks
# http://driver:4040

# Check executor logs
tail -f /var/log/spark/executor.log

# Thread dump
jstack <executor-pid>
```

**Solutions:**

1. **Check for Deadlock**
```bash
# Get thread dump
jstack <pid> | grep -A 20 "deadlock"
```

2. **Increase Parallelism**
```properties
spark.default.parallelism                       512
spark.sql.shuffle.partitions                    512
```

3. **Check Data Source**
```bash
# Ensure data is accessible
hdfs dfs -ls /data/path
```

4. **Restart Executors**
```bash
# Kill hanging executors
kill -9 <executor-pid>
```

### Issue: Serialization Errors

**Symptoms:**
```
NotSerializableException
Task not serializable
```

**Diagnosis:**
```scala
// Check what's being serialized
import org.apache.spark.util.Utils
Utils.serialize(yourObject)
```

**Solutions:**

1. **Use Kryo Serializer**
```properties
spark.serializer                                org.apache.spark.serializer.KryoSerializer
spark.kryo.registrationRequired                 false
```

2. **Mark Variables as Transient**
```scala
class MyClass extends Serializable {
  @transient lazy val nonSerializable = new NonSerializableClass()
}
```

3. **Broadcast Large Objects**
```scala
val broadcastVar = spark.sparkContext.broadcast(largeObject)
```

### Issue: ClassNotFoundException

**Symptoms:**
```
java.lang.ClassNotFoundException: com.your.Class
```

**Diagnosis:**
```bash
# Check JAR files
ls -la $SPARK_HOME/jars/

# Check classpath
echo $SPARK_CLASSPATH
```

**Solutions:**

1. **Include JARs**
```bash
spark-submit --jars your-dependency.jar your-app.jar
```

2. **Set Classpath**
```bash
export SPARK_CLASSPATH=/path/to/jars/*
```

3. **Use --packages**
```bash
spark-submit --packages com.company:artifact:version
```

## Debugging Tools

### Enable Debug Logging

```properties
# Log4j configuration
log4j.logger.org.apache.spark=DEBUG
log4j.logger.com.nvidia.spark.rapids=DEBUG
```

### Spark UI

```
http://driver-node:4040
```

Key sections:
- Jobs: Overall job progress
- Stages: Stage-level metrics
- Storage: Cached RDDs/DataFrames
- Environment: Configuration
- Executors: Resource usage
- SQL: Query plans

### Event Logs

```properties
spark.eventLog.enabled                          true
spark.eventLog.dir                              /var/log/spark/events
```

View with History Server:
```bash
$SPARK_HOME/sbin/start-history-server.sh
```

### GPU Profiling

```bash
# NVIDIA Nsight Systems
nsys profile -o spark-profile spark-submit your-app.jar

# RAPIDS profiling
spark-submit \
  --conf spark.rapids.sql.metrics.level=DEBUG \
  your-app.jar
```

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `CUDA out of memory` | GPU OOM | Reduce batch size or concurrent tasks |
| `Container killed by YARN` | Exceeded memory limits | Increase executor memory |
| `Shuffle fetch failed` | Network/disk issues | Increase timeouts, check storage |
| `Task not serializable` | Non-serializable closure | Use broadcast or transient |
| `File not found` | Missing data files | Check file paths |
| `Permission denied` | Insufficient permissions | Fix file/directory permissions |

## Getting Help

### Log Collection

```bash
# Collect all relevant logs
mkdir spark-debug
cp /var/log/spark/* spark-debug/
nvidia-smi > spark-debug/gpu-info.txt
spark-submit --version > spark-debug/spark-version.txt
tar -czf spark-debug.tar.gz spark-debug/
```

### Community Resources

- [Apache Spark User Mailing List](https://spark.apache.org/community.html)
- [RAPIDS Community](https://rapids.ai/community.html)
- [NVIDIA Developer Forums](https://forums.developer.nvidia.com/)
- [Stack Overflow: apache-spark](https://stackoverflow.com/questions/tagged/apache-spark)

## Next Steps

- [Configuration Guide](configuration.md) - Proper configuration
- [Tuning Guide](tuning.md) - Performance optimization
- [Best Practices](best-practices.md) - Avoid common issues

## References

- [Spark Troubleshooting](https://spark.apache.org/docs/latest/tuning.html#troubleshooting)
- [RAPIDS Troubleshooting](https://nvidia.github.io/spark-rapids/docs/troubleshooting.html)
- [DGX Support](https://docs.nvidia.com/dgx/support/)
