---
title: DGX Spark Examples
description: Real-world examples and code samples for Apache Spark on NVIDIA DGX systems
category: examples
tags: [spark, examples, code-samples, dgx, rapids, tutorials]
author: DGX-Spark MCP Team
dateCreated: 2025-11-14
version: 1.0.0
relatedDocs: [installation, configuration, tuning, best-practices]
---

# DGX Spark Examples

This guide provides practical, real-world examples for common Spark workloads on NVIDIA DGX systems with GPU acceleration.

## Example 1: ETL Pipeline with GPU Acceleration

### Scenario
Process 1TB of JSON log files, clean and aggregate daily metrics, save as Parquet.

### Implementation

```scala
import org.apache.spark.sql.{SparkSession, DataFrame}
import org.apache.spark.sql.functions._
import org.apache.spark.sql.types._

object LogETL {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("Log ETL with GPU")
      .config("spark.rapids.sql.enabled", "true")
      .config("spark.executor.resource.gpu.amount", "1")
      .config("spark.task.resource.gpu.amount", "0.125")
      .config("spark.sql.shuffle.partitions", "800")
      .getOrCreate()

    import spark.implicits._

    // Define schema for better performance
    val schema = StructType(Seq(
      StructField("timestamp", TimestampType, nullable = false),
      StructField("user_id", StringType, nullable = false),
      StructField("action", StringType, nullable = false),
      StructField("duration_ms", IntegerType, nullable = true),
      StructField("success", BooleanType, nullable = false),
      StructField("metadata", StringType, nullable = true)
    ))

    // Read JSON with schema
    val rawLogs = spark.read
      .schema(schema)
      .json("s3://logs/raw/2024-01-*/")

    // Clean and transform
    val cleanedLogs = rawLogs
      .filter($"timestamp".isNotNull)
      .filter($"duration_ms" > 0)
      .withColumn("date", to_date($"timestamp"))
      .withColumn("hour", hour($"timestamp"))
      .cache()

    println(s"Total logs: ${cleanedLogs.count()}")

    // Daily aggregations
    val dailyStats = cleanedLogs
      .groupBy("date", "action")
      .agg(
        count("*").as("total_count"),
        sum(when($"success", 1).otherwise(0)).as("success_count"),
        avg($"duration_ms").as("avg_duration_ms"),
        percentile_approx($"duration_ms", 0.95).as("p95_duration_ms")
      )
      .withColumn("success_rate", $"success_count" / $"total_count")

    // Write partitioned output
    dailyStats.write
      .partitionBy("date")
      .mode("overwrite")
      .parquet("s3://logs/processed/daily_stats")

    // Hourly aggregations
    val hourlyStats = cleanedLogs
      .groupBy("date", "hour", "action")
      .agg(
        count("*").as("total_count"),
        sum($"duration_ms").as("total_duration_ms")
      )

    hourlyStats.write
      .partitionBy("date", "hour")
      .mode("overwrite")
      .parquet("s3://logs/processed/hourly_stats")

    cleanedLogs.unpersist()
    spark.stop()
  }
}
```

### Running the Job

```bash
spark-submit \
  --master spark://dgx-master:7077 \
  --deploy-mode cluster \
  --executor-memory 128g \
  --executor-cores 16 \
  --num-executors 16 \
  --conf spark.rapids.sql.enabled=true \
  --conf spark.executor.resource.gpu.amount=1 \
  --conf spark.task.resource.gpu.amount=0.125 \
  --class com.example.LogETL \
  log-etl.jar
```

## Example 2: Large-Scale Join Optimization

### Scenario
Join 500GB user events with 10GB user profiles, optimize for GPU.

### Implementation

```scala
object OptimizedJoin {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("Optimized Join with GPU")
      .config("spark.rapids.sql.enabled", "true")
      .config("spark.sql.adaptive.enabled", "true")
      .config("spark.sql.adaptive.skewJoin.enabled", "true")
      .getOrCreate()

    import spark.implicits._

    // Read large events table
    val events = spark.read.parquet("hdfs:///data/events")
      .repartition($"user_id")  // Pre-partition for join

    // Read small profiles table
    val profiles = spark.read.parquet("hdfs:///data/profiles")

    // Strategy 1: Broadcast join (if profiles < 100MB)
    if (profiles.count() < 1000000) {
      import org.apache.spark.sql.functions.broadcast

      val result = events.join(broadcast(profiles), "user_id")
        .select(
          $"user_id",
          $"event_type",
          $"timestamp",
          $"profile.country",
          $"profile.age_group"
        )

      result.write.parquet("hdfs:///data/enriched_events_broadcast")
    }

    // Strategy 2: Bucket join (for repeated joins)
    events.write
      .bucketBy(200, "user_id")
      .sortBy("user_id")
      .mode("overwrite")
      .saveAsTable("events_bucketed")

    profiles.write
      .bucketBy(200, "user_id")
      .sortBy("user_id")
      .mode("overwrite")
      .saveAsTable("profiles_bucketed")

    val bucketJoinResult = spark.table("events_bucketed")
      .join(spark.table("profiles_bucketed"), "user_id")

    bucketJoinResult.write.parquet("hdfs:///data/enriched_events_bucketed")

    // Strategy 3: Skew join handling
    // Identify skewed keys
    val skewedUsers = events.groupBy("user_id")
      .count()
      .filter($"count" > 1000000)
      .select("user_id")
      .collect()
      .map(_.getString(0))

    // Separate skewed and normal data
    val normalEvents = events.filter(!$"user_id".isin(skewedUsers: _*))
    val skewedEvents = events.filter($"user_id".isin(skewedUsers: _*))

    // Process normal data with sort-merge join
    val normalResult = normalEvents.join(profiles, "user_id")

    // Process skewed data with salting
    val saltedSkewed = skewedEvents
      .withColumn("salt", (rand() * 10).cast("int"))
      .withColumn("join_key", concat($"user_id", lit("_"), $"salt"))

    val saltedProfiles = profiles
      .filter($"user_id".isin(skewedUsers: _*))
      .withColumn("salt", explode(array((0 until 10).map(lit): _*)))
      .withColumn("join_key", concat($"user_id", lit("_"), $"salt"))

    val skewedResult = saltedSkewed
      .join(saltedProfiles, "join_key")
      .drop("salt", "join_key")

    // Combine results
    val finalResult = normalResult.union(skewedResult)
    finalResult.write.parquet("hdfs:///data/enriched_events_skew_optimized")

    spark.stop()
  }
}
```

## Example 3: Real-Time Streaming with GPU

### Scenario
Process Kafka stream of sensor data in real-time, aggregate per minute.

### Implementation

```scala
import org.apache.spark.sql.streaming.Trigger

object GPUStreaming {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("GPU Streaming")
      .config("spark.rapids.sql.enabled", "true")
      .config("spark.executor.resource.gpu.amount", "1")
      .getOrCreate()

    import spark.implicits._

    // Read from Kafka
    val kafkaStream = spark.readStream
      .format("kafka")
      .option("kafka.bootstrap.servers", "kafka-broker:9092")
      .option("subscribe", "sensor-data")
      .option("startingOffsets", "latest")
      .load()

    // Parse JSON
    val sensorSchema = new StructType()
      .add("sensor_id", StringType)
      .add("temperature", DoubleType)
      .add("pressure", DoubleType)
      .add("humidity", DoubleType)
      .add("timestamp", TimestampType)

    val parsedStream = kafkaStream
      .selectExpr("CAST(value AS STRING) as json")
      .select(from_json($"json", sensorSchema).as("data"))
      .select("data.*")

    // Windowed aggregations (GPU-accelerated)
    val aggregated = parsedStream
      .withWatermark("timestamp", "1 minute")
      .groupBy(
        window($"timestamp", "1 minute"),
        $"sensor_id"
      )
      .agg(
        avg($"temperature").as("avg_temp"),
        min($"temperature").as("min_temp"),
        max($"temperature").as("max_temp"),
        avg($"pressure").as("avg_pressure"),
        avg($"humidity").as("avg_humidity"),
        count("*").as("reading_count")
      )

    // Anomaly detection
    val withAnomalies = aggregated
      .withColumn("temp_anomaly",
        when($"avg_temp" > 100 || $"avg_temp" < -50, true).otherwise(false))
      .withColumn("pressure_anomaly",
        when($"avg_pressure" > 1100 || $"avg_pressure" < 900, true).otherwise(false))

    // Write to multiple sinks
    // Sink 1: All data to S3
    val s3Sink = withAnomalies.writeStream
      .format("parquet")
      .option("path", "s3://sensor-data/aggregated")
      .option("checkpointLocation", "s3://sensor-data/checkpoints/all")
      .trigger(Trigger.ProcessingTime("1 minute"))
      .start()

    // Sink 2: Anomalies to Kafka for alerting
    val anomalySink = withAnomalies
      .filter($"temp_anomaly" || $"pressure_anomaly")
      .selectExpr("sensor_id as key", "to_json(struct(*)) as value")
      .writeStream
      .format("kafka")
      .option("kafka.bootstrap.servers", "kafka-broker:9092")
      .option("topic", "sensor-anomalies")
      .option("checkpointLocation", "s3://sensor-data/checkpoints/anomalies")
      .start()

    // Sink 3: Console for monitoring
    val consoleSink = withAnomalies.writeStream
      .format("console")
      .trigger(Trigger.ProcessingTime("10 seconds"))
      .start()

    spark.streams.awaitAnyTermination()
  }
}
```

## Example 4: Machine Learning Pipeline

### Scenario
Train XGBoost model on 100GB dataset using GPU acceleration.

### Implementation

```scala
import ml.dmlc.xgboost4j.scala.spark.{XGBoostClassifier, XGBoostClassificationModel}
import org.apache.spark.ml.feature.{VectorAssembler, StandardScaler}
import org.apache.spark.ml.Pipeline

object MLPipeline {
  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("GPU ML Pipeline")
      .config("spark.rapids.sql.enabled", "true")
      .config("spark.executor.resource.gpu.amount", "1")
      .config("spark.task.resource.gpu.amount", "1")  // 1 GPU per task for ML
      .getOrCreate()

    import spark.implicits._

    // Load data
    val data = spark.read.parquet("hdfs:///data/training_data")

    // Feature engineering
    val featureCols = Array(
      "feature1", "feature2", "feature3", "feature4",
      "feature5", "feature6", "feature7", "feature8"
    )

    val assembler = new VectorAssembler()
      .setInputCols(featureCols)
      .setOutputCol("features_raw")

    val scaler = new StandardScaler()
      .setInputCol("features_raw")
      .setOutputCol("features")
      .setWithStd(true)
      .setWithMean(false)

    // XGBoost with GPU
    val xgbParams = Map(
      "eta" -> 0.1,
      "max_depth" -> 8,
      "objective" -> "binary:logistic",
      "num_round" -> 100,
      "num_workers" -> 8,
      "tree_method" -> "gpu_hist",  // GPU acceleration
      "gpu_id" -> 0
    )

    val xgbClassifier = new XGBoostClassifier(xgbParams)
      .setFeaturesCol("features")
      .setLabelCol("label")

    // Create pipeline
    val pipeline = new Pipeline()
      .setStages(Array(assembler, scaler, xgbClassifier))

    // Split data
    val Array(trainData, testData) = data.randomSplit(Array(0.8, 0.2), seed = 42)

    // Train model
    println("Training model...")
    val model = pipeline.fit(trainData)

    // Evaluate
    val predictions = model.transform(testData)

    import org.apache.spark.ml.evaluation.BinaryClassificationEvaluator

    val evaluator = new BinaryClassificationEvaluator()
      .setLabelCol("label")
      .setRawPredictionCol("rawPrediction")

    val auc = evaluator.evaluate(predictions)
    println(s"Test AUC: $auc")

    // Save model
    model.write.overwrite().save("hdfs:///models/xgboost_model")

    spark.stop()
  }
}
```

## Example 5: Data Quality Validation

### Scenario
Validate data quality across multiple dimensions before loading to warehouse.

### Implementation

```scala
object DataQuality {
  case class ValidationResult(
    check_name: String,
    passed: Boolean,
    failed_count: Long,
    details: String
  )

  def validateData(df: DataFrame): Seq[ValidationResult] = {
    import df.sparkSession.implicits._
    val results = scala.collection.mutable.ArrayBuffer[ValidationResult]()

    // Check 1: No null in required columns
    val requiredCols = Seq("id", "timestamp", "user_id")
    requiredCols.foreach { col =>
      val nullCount = df.filter(df(col).isNull).count()
      results += ValidationResult(
        check_name = s"null_check_$col",
        passed = nullCount == 0,
        failed_count = nullCount,
        details = if (nullCount > 0) s"Found $nullCount null values in $col" else "OK"
      )
    }

    // Check 2: Data freshness
    val latestTimestamp = df.agg(max("timestamp")).first().getTimestamp(0)
    val hoursSinceUpdate = (System.currentTimeMillis() - latestTimestamp.getTime) / (1000 * 3600)
    results += ValidationResult(
      check_name = "data_freshness",
      passed = hoursSinceUpdate < 24,
      failed_count = if (hoursSinceUpdate >= 24) 1 else 0,
      details = s"Latest data is $hoursSinceUpdate hours old"
    )

    // Check 3: Value ranges
    val amountStats = df.agg(
      min("amount").as("min_amount"),
      max("amount").as("max_amount")
    ).first()

    val minAmount = amountStats.getDouble(0)
    val maxAmount = amountStats.getDouble(1)

    results += ValidationResult(
      check_name = "amount_range",
      passed = minAmount >= 0 && maxAmount < 1000000,
      failed_count = df.filter($"amount" < 0 || $"amount" >= 1000000).count(),
      details = s"Amount range: [$minAmount, $maxAmount]"
    )

    // Check 4: Duplicates
    val totalCount = df.count()
    val distinctCount = df.dropDuplicates("id").count()
    val duplicateCount = totalCount - distinctCount

    results += ValidationResult(
      check_name = "duplicate_ids",
      passed = duplicateCount == 0,
      failed_count = duplicateCount,
      details = s"Found $duplicateCount duplicate IDs"
    )

    // Check 5: Referential integrity
    val orphanCount = df.filter(!$"user_id".isin(validUserIds: _*)).count()
    results += ValidationResult(
      check_name = "referential_integrity",
      passed = orphanCount == 0,
      failed_count = orphanCount,
      details = s"Found $orphanCount orphan records"
    )

    results.toSeq
  }

  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("Data Quality Validation")
      .config("spark.rapids.sql.enabled", "true")
      .getOrCreate()

    import spark.implicits._

    val df = spark.read.parquet("hdfs:///data/incoming")

    // Run validations
    val results = validateData(df)

    // Save results
    spark.createDataFrame(results)
      .write
      .mode("overwrite")
      .parquet("hdfs:///data/quality_checks")

    // Fail job if critical checks fail
    val criticalFailed = results.filter(r =>
      !r.passed && r.check_name.startsWith("null_check")
    )

    if (criticalFailed.nonEmpty) {
      println("CRITICAL VALIDATION FAILURES:")
      criticalFailed.foreach(r => println(s"  - ${r.check_name}: ${r.details}"))
      sys.exit(1)
    }

    println("All validations passed!")
    spark.stop()
  }
}
```

## Example 6: Performance Benchmarking

### Scenario
Benchmark GPU vs CPU performance on same workload.

### Implementation

```scala
object GPUBenchmark {
  def runBenchmark(df: DataFrame, enableGPU: Boolean): Long = {
    val spark = df.sparkSession

    if (enableGPU) {
      spark.conf.set("spark.rapids.sql.enabled", "true")
    } else {
      spark.conf.set("spark.rapids.sql.enabled", "false")
    }

    val startTime = System.currentTimeMillis()

    // Complex query
    val result = df
      .filter($"amount" > 0)
      .groupBy("category", "region")
      .agg(
        sum($"amount").as("total"),
        avg($"amount").as("average"),
        count("*").as("count"),
        stddev($"amount").as("stddev")
      )
      .filter($"count" > 100)
      .orderBy($"total".desc)
      .limit(1000)

    // Trigger execution
    result.write.mode("overwrite").parquet(s"/tmp/benchmark_${if (enableGPU) "gpu" else "cpu"}")

    val duration = System.currentTimeMillis() - startTime
    duration
  }

  def main(args: Array[String]): Unit = {
    val spark = SparkSession.builder()
      .appName("GPU Benchmark")
      .config("spark.executor.resource.gpu.amount", "1")
      .getOrCreate()

    // Load test data
    val df = spark.read.parquet("hdfs:///data/benchmark_data").cache()
    df.count()  // Materialize cache

    // Warmup
    println("Warming up...")
    runBenchmark(df, enableGPU = true)

    // Benchmark CPU
    println("Benchmarking CPU...")
    val cpuTimes = (1 to 5).map { i =>
      println(s"  Run $i/5")
      runBenchmark(df, enableGPU = false)
    }
    val avgCPU = cpuTimes.sum / cpuTimes.length

    // Benchmark GPU
    println("Benchmarking GPU...")
    val gpuTimes = (1 to 5).map { i =>
      println(s"  Run $i/5")
      runBenchmark(df, enableGPU = true)
    }
    val avgGPU = gpuTimes.sum / gpuTimes.length

    // Results
    println("\n=== BENCHMARK RESULTS ===")
    println(f"CPU Average: ${avgCPU/1000.0}%.2f seconds")
    println(f"GPU Average: ${avgGPU/1000.0}%.2f seconds")
    println(f"Speedup: ${avgCPU.toDouble/avgGPU}%.2fx")

    df.unpersist()
    spark.stop()
  }
}
```

## Quick Reference

### Common Spark-Submit Commands

```bash
# Basic GPU job
spark-submit \
  --conf spark.rapids.sql.enabled=true \
  --conf spark.executor.resource.gpu.amount=1 \
  app.jar

# Production cluster
spark-submit \
  --master spark://dgx-master:7077 \
  --deploy-mode cluster \
  --executor-memory 128g \
  --executor-cores 16 \
  --num-executors 16 \
  --conf spark.rapids.sql.enabled=true \
  --conf spark.sql.adaptive.enabled=true \
  app.jar

# Streaming job
spark-submit \
  --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.0 \
  --conf spark.rapids.sql.enabled=true \
  --conf spark.streaming.stopGracefullyOnShutdown=true \
  streaming-app.jar

# ML training
spark-submit \
  --packages ml.dmlc:xgboost4j-spark_2.12:1.7.0 \
  --conf spark.task.resource.gpu.amount=1 \
  --conf spark.executor.resource.gpu.amount=1 \
  ml-training.jar
```

### Useful PySpark Snippets

```python
from pyspark.sql import SparkSession
from pyspark.sql.functions import *

# Initialize with GPU
spark = SparkSession.builder \
    .appName("PySpark GPU") \
    .config("spark.rapids.sql.enabled", "true") \
    .config("spark.executor.resource.gpu.amount", "1") \
    .getOrCreate()

# Read and process
df = spark.read.parquet("data.parquet")
result = df.groupBy("category").agg(
    count("*").alias("total"),
    sum("amount").alias("sum_amount"),
    avg("amount").alias("avg_amount")
)

# Write partitioned
result.write.partitionBy("category").parquet("output")
```

## Next Steps

- [Configuration Guide](configuration.md) - Configure these examples for your environment
- [Tuning Guide](tuning.md) - Optimize performance further
- [Best Practices](best-practices.md) - Production deployment guidelines

## References

- [Spark Examples Repository](https://github.com/apache/spark/tree/master/examples)
- [RAPIDS Spark Examples](https://github.com/NVIDIA/spark-rapids/tree/main/examples)
- [Databricks Examples](https://docs.databricks.com/getting-started/spark/quick-start.html)
