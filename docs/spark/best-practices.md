---
title: DGX Spark Best Practices
description: Production best practices for Apache Spark on NVIDIA DGX systems
category: best-practices
tags: [spark, best-practices, production, dgx, guidelines, recommendations]
author: DGX-Spark MCP Team
dateCreated: 2025-11-14
version: 1.0.0
relatedDocs: [configuration, tuning, troubleshooting]
---

# DGX Spark Best Practices

This guide provides production-ready best practices for deploying and operating Apache Spark on NVIDIA DGX systems with GPU acceleration.

## Architecture Design

### Cluster Sizing

#### Resource Allocation Strategy

**DGX A100 (8x A100 80GB, 2TB RAM, 128 cores)**

```
Recommended Configuration:
- Executors: 8 (one per GPU)
- Cores per executor: 12-16
- Memory per executor: 185GB heap + 47GB overhead
- GPUs per executor: 1
- Reserve: 16 cores and 128GB for system/driver
```

**Calculation:**
```python
# Available resources
total_cores = 128
total_memory = 2048  # GB
total_gpus = 8

# Reserved for system
system_cores = 16
system_memory = 128  # GB

# Driver allocation
driver_cores = 8
driver_memory = 64  # GB

# Available for executors
available_cores = total_cores - system_cores - driver_cores  # 104
available_memory = total_memory - system_memory - driver_memory  # 1856 GB

# Executor configuration
num_executors = total_gpus  # 8
cores_per_executor = available_cores // num_executors  # 13
memory_per_executor = available_memory // num_executors  # 232 GB

# Split executor memory (80% heap, 20% overhead)
executor_heap = int(memory_per_executor * 0.8)  # 185 GB
executor_overhead = int(memory_per_executor * 0.2)  # 47 GB
```

### Data Organization

#### Partitioning Strategy

**Use Hive-style partitioning for time-series data:**

```
/data/events/
  year=2024/
    month=01/
      day=01/
        part-00000.parquet
        part-00001.parquet
      day=02/
        ...
```

**Benefits:**
- Partition pruning reduces data read
- Parallel reads from multiple partitions
- Easy data lifecycle management

**Code:**
```scala
// Write partitioned data
df.write
  .partitionBy("year", "month", "day")
  .mode("append")
  .parquet("/data/events")

// Read with partition pruning
spark.read.parquet("/data/events")
  .filter($"year" === 2024 && $"month" === 1)
```

#### File Format Selection

| Format | Use Case | Pros | Cons |
|--------|----------|------|------|
| **Parquet** | Analytics, OLAP | Column pruning, compression, GPU-friendly | Slower writes |
| **ORC** | Hive workloads | ACID support, predicate pushdown | Less GPU support |
| **Avro** | Data exchange | Schema evolution, row-oriented | No column pruning |
| **Delta Lake** | ACID transactions | Time travel, upserts, versioning | Additional overhead |

**Recommendation:** Use Parquet for DGX Spark workloads.

### Job Design Patterns

#### Pattern 1: Batch ETL

```scala
// Good: Incremental processing with checkpoints
val lastProcessed = spark.read.parquet("/checkpoints/last_processed")
  .select(max($"timestamp")).first().getTimestamp(0)

val newData = spark.read.parquet("/data/raw")
  .filter($"timestamp" > lastProcessed)
  .transform(cleanData)
  .transform(enrichData)
  .transform(aggregateData)

newData.write.mode("append").parquet("/data/processed")

// Update checkpoint
spark.createDataFrame(Seq((System.currentTimeMillis()))).toDF("timestamp")
  .write.mode("overwrite").parquet("/checkpoints/last_processed")
```

#### Pattern 2: Streaming Workloads

```scala
// Structured Streaming with GPU acceleration
val stream = spark.readStream
  .format("kafka")
  .option("kafka.bootstrap.servers", "localhost:9092")
  .option("subscribe", "events")
  .load()

val processed = stream
  .selectExpr("CAST(value AS STRING) as json")
  .select(from_json($"json", schema).as("data"))
  .select("data.*")
  .groupBy(window($"timestamp", "1 minute"), $"category")
  .agg(
    count("*").as("count"),
    sum($"amount").as("total")
  )

processed.writeStream
  .format("parquet")
  .option("checkpointLocation", "/checkpoints/stream")
  .option("path", "/data/aggregated")
  .trigger(Trigger.ProcessingTime("1 minute"))
  .start()
```

## GPU Acceleration

### When to Use GPU Acceleration

**✅ Good Use Cases:**
- Large-scale data aggregations (GROUP BY, SUM, AVG)
- Joins on large tables (> 1 GB)
- Complex SQL queries with multiple operations
- ETL pipelines with filters, projections
- Window functions
- String operations at scale

**❌ Poor Use Cases:**
- Small datasets (< 100 MB)
- Simple reads/writes only
- UDFs with complex logic (not GPU-compatible)
- High-cardinality GROUP BY (> 1M groups)

### GPU Memory Management

**Rule: Keep GPU memory < 80% utilized**

```scala
// Monitor GPU memory
import org.apache.spark.sql.rapids.GpuMemoryManager

// Configure spilling
spark.conf.set("spark.rapids.sql.batchSizeBytes", "1073741824")  // 1GB
spark.conf.set("spark.rapids.sql.concurrentGpuTasks", "2")

// Enable CPU fallback for OOM
spark.conf.set("spark.rapids.sql.enableCpuFallback", "true")
```

### Operation Acceleration Checklist

```sql
-- Check which operations run on GPU
EXPLAIN FORMATTED
SELECT category, AVG(amount) as avg_amount
FROM transactions
WHERE date >= '2024-01-01'
GROUP BY category

-- Look for "Gpu" prefixed operators:
-- GpuFileSourceScan, GpuFilter, GpuProject, GpuHashAggregate
```

## Performance Optimization

### Caching Strategy

**Cache only when reused multiple times:**

```scala
// Good: Cache when accessing 3+ times
val importantData = spark.read.parquet("/data/important").cache()
val result1 = importantData.filter($"category" === "A").count()
val result2 = importantData.filter($"category" === "B").count()
val result3 = importantData.groupBy("region").count()

// Unpersist when done
importantData.unpersist()

// Bad: Cache everything
val data = spark.read.parquet("/data").cache()  // Wastes memory
```

**Storage level selection:**

```scala
// Default: Good for most cases
df.cache()  // MEMORY_AND_DISK_SER

// Large DataFrames with frequent access
df.persist(StorageLevel.MEMORY_AND_DISK_SER)

// Small DataFrames that fit in memory
df.persist(StorageLevel.MEMORY_ONLY)

// GPU caching (automatic with RAPIDS)
df.cache()  // Uses GPU memory when available
```

### Join Optimization

**Join type selection:**

```scala
// 1. Broadcast join (small-large)
val small = spark.read.parquet("/data/small")  // < 100 MB
val large = spark.read.parquet("/data/large")  // > 10 GB

import org.apache.spark.sql.functions.broadcast
val result = large.join(broadcast(small), "key")

// 2. Sort-merge join (large-large)
val large1 = spark.read.parquet("/data/large1").repartition($"key")
val large2 = spark.read.parquet("/data/large2").repartition($"key")
val result = large1.join(large2, "key")

// 3. Bucket join (repeated joins on same key)
df1.write.bucketBy(200, "key").sortBy("key").saveAsTable("bucketed_table1")
df2.write.bucketBy(200, "key").sortBy("key").saveAsTable("bucketed_table2")

spark.table("bucketed_table1").join(spark.table("bucketed_table2"), "key")
```

**Avoid:**
```scala
// Bad: Cartesian join
df1.crossJoin(df2)  // Explodes data

// Bad: Multiple small joins
val result = df1.join(df2, "k1")
  .join(df3, "k2")
  .join(df4, "k3")  // Inefficient

// Better: Combine into single multi-join
val result = df1.join(df2, "k1")
  .join(df3.join(df4, "k3"), "k2")
```

### Partition Tuning

**Dynamic partition count:**

```scala
// Calculate partitions based on data size
val dataSizeGB = 1000
val targetPartitionSizeMB = 256
val partitions = (dataSizeGB * 1024 / targetPartitionSizeMB).toInt

spark.conf.set("spark.sql.shuffle.partitions", partitions)
```

**Repartition vs Coalesce:**

```scala
// Repartition: Full shuffle (use when increasing partitions)
val morePartitions = df.repartition(1000)

// Coalesce: Minimize shuffle (use when decreasing partitions)
val fewerPartitions = df.coalesce(100)

// Partition by column (for joins)
val partitioned = df.repartition($"date")
```

## Code Quality

### Avoid Common Anti-Patterns

**❌ Anti-Pattern 1: collect() on Large Data**

```scala
// Bad: Driver OOM
val allData = hugeDf.collect()  // Don't do this!

// Good: Write to storage
hugeDf.write.parquet("/output")

// Good: Sample for inspection
val sample = hugeDf.sample(0.01).take(100)
```

**❌ Anti-Pattern 2: UDFs Instead of Built-in Functions**

```scala
// Bad: UDF (slow, not GPU-accelerated)
val parseDate = udf((s: String) => s.substring(0, 10))
df.withColumn("date", parseDate($"timestamp"))

// Good: Built-in function (fast, GPU-accelerated)
df.withColumn("date", substring($"timestamp", 0, 10))
```

**❌ Anti-Pattern 3: Multiple Passes Over Data**

```scala
// Bad: Multiple scans
val count = df.filter($"amount" > 100).count()
val sum = df.filter($"amount" > 100).agg(sum($"amount")).first()

// Good: Single scan with cache
val filtered = df.filter($"amount" > 100).cache()
val count = filtered.count()
val sum = filtered.agg(sum($"amount")).first()
filtered.unpersist()

// Better: Single aggregation
val stats = df.filter($"amount" > 100)
  .agg(count("*").as("count"), sum($"amount").as("total"))
```

### Code Organization

**Modular pipeline design:**

```scala
object DataPipeline {
  def clean(df: DataFrame): DataFrame = {
    df.filter($"amount".isNotNull)
      .filter($"amount" > 0)
      .dropDuplicates("id")
  }

  def enrich(df: DataFrame): DataFrame = {
    df.withColumn("year", year($"date"))
      .withColumn("month", month($"date"))
      .withColumn("category_upper", upper($"category"))
  }

  def aggregate(df: DataFrame): DataFrame = {
    df.groupBy("year", "month", "category_upper")
      .agg(
        count("*").as("count"),
        sum($"amount").as("total"),
        avg($"amount").as("average")
      )
  }

  def run(inputPath: String, outputPath: String): Unit = {
    val spark = SparkSession.builder().getOrCreate()

    spark.read.parquet(inputPath)
      .transform(clean)
      .transform(enrich)
      .transform(aggregate)
      .write.mode("overwrite").parquet(outputPath)
  }
}
```

## Monitoring and Observability

### Essential Metrics

**Application-level metrics:**

```scala
// Add application metrics
import org.apache.spark.metrics.source.Source

// Custom metric collection
spark.sparkContext.addSparkListener(new SparkListener {
  override def onTaskEnd(taskEnd: SparkListenerTaskEnd): Unit = {
    val metrics = taskEnd.taskMetrics
    println(s"Executor CPU Time: ${metrics.executorCpuTime}")
    println(s"Executor Run Time: ${metrics.executorRunTime}")
    println(s"Shuffle Read: ${metrics.shuffleReadMetrics.totalBytesRead}")
  }
})
```

**Key metrics to monitor:**
- Job duration and success rate
- Task failure rate and retries
- Shuffle read/write volume
- GPU utilization percentage
- Memory usage (heap and off-heap)
- GC time percentage
- Data skew indicators

### Logging Best Practices

```scala
// Use proper logging framework
import org.apache.log4j.Logger

object MyApp {
  @transient lazy val log = Logger.getLogger(getClass.getName)

  def processData(df: DataFrame): DataFrame = {
    log.info("Starting data processing")
    val rowCount = df.count()
    log.info(s"Processing $rowCount rows")

    val result = df.filter($"amount" > 0)
    log.info(s"Filtered to ${result.count()} rows")

    result
  }
}
```

**Log levels:**
- ERROR: Failures requiring attention
- WARN: Potential issues (skew, spill, etc.)
- INFO: Progress milestones
- DEBUG: Detailed debugging (disable in prod)

## Security

### Data Security

**Encryption at rest:**

```properties
# Enable I/O encryption
spark.io.encryption.enabled                     true

# SSL/TLS for network
spark.ssl.enabled                               true
spark.ssl.keyStore                              /path/to/keystore.jks
spark.ssl.keyStorePassword                      <password>
```

**Authentication:**

```properties
# Enable authentication
spark.authenticate                              true
spark.authenticate.secret                       <shared-secret>

# Kerberos (enterprise)
spark.yarn.keytab                               /path/to/keytab
spark.yarn.principal                            user@DOMAIN
```

### Resource Isolation

**YARN Resource Pools:**

```bash
spark-submit \
  --master yarn \
  --queue production \
  --conf spark.executor.instances=16 \
  --conf spark.dynamicAllocation.enabled=false \
  my-app.jar
```

**Kubernetes Resource Quotas:**

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: spark-quota
spec:
  hard:
    requests.cpu: "500"
    requests.memory: 2Ti
    nvidia.com/gpu: "64"
```

## Deployment

### Environment Management

**Use environment-specific configs:**

```bash
# Development
spark-submit \
  --properties-file conf/spark-dev.conf \
  app.jar

# Production
spark-submit \
  --properties-file conf/spark-prod.conf \
  app.jar
```

**conf/spark-prod.conf:**
```properties
spark.master                                    spark://dgx-cluster:7077
spark.executor.instances                        32
spark.executor.memory                           185g
spark.executor.cores                            16
spark.dynamicAllocation.enabled                 true
spark.eventLog.enabled                          true
spark.eventLog.dir                              hdfs:///var/log/spark/events
```

### Continuous Integration

**Testing pyramid:**

```
Unit Tests (70%)
  ├── DataFrame transformations
  ├── Business logic
  └── Data quality checks

Integration Tests (20%)
  ├── Read/write operations
  ├── External system integration
  └── End-to-end pipelines

Performance Tests (10%)
  ├── Scalability tests
  ├── GPU acceleration verification
  └── Resource usage profiling
```

**Sample test:**

```scala
class DataPipelineTest extends FunSuite {
  test("clean removes null amounts") {
    val spark = SparkSession.builder().master("local[*]").getOrCreate()
    import spark.implicits._

    val input = Seq(
      (1, Some(100.0)),
      (2, None),
      (3, Some(200.0))
    ).toDF("id", "amount")

    val result = DataPipeline.clean(input)
    assert(result.count() == 2)
  }
}
```

## Disaster Recovery

### Checkpoint Management

```scala
// Enable checkpointing for iterative algorithms
spark.sparkContext.setCheckpointDir("hdfs:///checkpoints")

// Checkpoint expensive computations
val expensive = df.filter(...).join(...).groupBy(...)
expensive.checkpoint()
```

### Failure Recovery

```properties
# Automatic retry on failure
spark.task.maxFailures                          4
spark.stage.maxConsecutiveAttempts              4

# Speculation (rerun slow tasks)
spark.speculation                               true
spark.speculation.multiplier                    1.5
spark.speculation.quantile                      0.9
```

## Capacity Planning

### Growth Projection

**Calculate future requirements:**

```python
# Current state
current_data_tb = 100
current_daily_growth_gb = 500
projection_months = 12

# Future state
future_data_tb = current_data_tb + (current_daily_growth_gb * 30 * projection_months / 1024)
print(f"Projected data size in {projection_months} months: {future_data_tb} TB")

# Resource requirements
storage_factor = 3  # Replication + overhead
required_storage_tb = future_data_tb * storage_factor

compute_hours_per_tb = 2  # Based on current workloads
required_gpu_hours = future_data_tb * compute_hours_per_tb
```

## Checklist

### Pre-Production Deployment

- [ ] Resource sizing validated with production data volume
- [ ] GPU acceleration verified and benchmarked
- [ ] Monitoring and alerting configured
- [ ] Log aggregation set up
- [ ] Security enabled (encryption, authentication)
- [ ] Backup and disaster recovery plan in place
- [ ] Performance baselines established
- [ ] Documentation completed
- [ ] Team trained on operations
- [ ] Runbooks created for common issues

### Daily Operations

- [ ] Check cluster health (Spark UI, metrics)
- [ ] Review job success/failure rates
- [ ] Monitor resource utilization (CPU, memory, GPU)
- [ ] Check storage capacity
- [ ] Review and address alerts
- [ ] Prune old logs and checkpoints

### Weekly Maintenance

- [ ] Analyze slow jobs and optimize
- [ ] Review and update resource allocations
- [ ] Test backup and recovery procedures
- [ ] Update dependencies (security patches)
- [ ] Review and archive old data
- [ ] Performance trend analysis

## Next Steps

- [Configuration Guide](configuration.md) - Detailed configuration reference
- [Tuning Guide](tuning.md) - Advanced optimization techniques
- [Troubleshooting Guide](troubleshooting.md) - Common issues and solutions
- [Examples](examples.md) - Real-world implementation examples

## References

- [Spark Best Practices - Databricks](https://docs.databricks.com/spark/latest/spark-sql/spark-sql-performance-tuning.html)
- [RAPIDS Best Practices](https://nvidia.github.io/spark-rapids/docs/best-practices.html)
- [DGX Operations Guide](https://docs.nvidia.com/dgx/operations/)
