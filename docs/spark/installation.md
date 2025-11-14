---
title: DGX Spark Installation Guide
description: Complete guide to installing and configuring Apache Spark on NVIDIA DGX systems
category: installation
tags: [spark, installation, dgx, setup, getting-started]
author: DGX-Spark MCP Team
dateCreated: 2025-11-14
version: 1.0.0
relatedDocs: [configuration, tuning, best-practices]
---

# DGX Spark Installation Guide

This guide walks you through installing Apache Spark optimized for NVIDIA DGX systems with GPU acceleration support.

## Prerequisites

### Hardware Requirements

- NVIDIA DGX A100, H100, or compatible GPU server
- Minimum 8 NVIDIA GPUs (A100 or H100 recommended)
- 1TB+ system memory
- 10+ TB NVMe storage for HDFS/data
- High-speed networking (InfiniBand or 100GbE+)

### Software Requirements

- Ubuntu 20.04 LTS or later
- NVIDIA Driver 535+ (compatible with CUDA 12.0+)
- CUDA Toolkit 12.0+
- cuDNN 8.9+
- Docker 20.10+ (optional, for containerized deployment)
- Java 8 or Java 11 (OpenJDK recommended)

## Installation Methods

### Method 1: Native Installation (Recommended for Development)

#### Step 1: Install Java

```bash
# Install OpenJDK 11
sudo apt update
sudo apt install -y openjdk-11-jdk

# Verify installation
java -version
```

#### Step 2: Download Apache Spark

```bash
# Download Spark 3.5.0 (or latest)
cd /opt
sudo wget https://archive.apache.org/dist/spark/spark-3.5.0/spark-3.5.0-bin-hadoop3.tgz

# Extract
sudo tar -xzf spark-3.5.0-bin-hadoop3.tgz
sudo mv spark-3.5.0-bin-hadoop3 spark

# Set ownership
sudo chown -R $USER:$USER /opt/spark
```

#### Step 3: Install RAPIDS Accelerator for Apache Spark

```bash
# Download RAPIDS Spark plugin
cd /opt/spark/jars
wget https://repo1.maven.org/maven2/com/nvidia/rapids-4-spark_2.12/24.08.0/rapids-4-spark_2.12-24.08.0.jar

# Download cuDF JAR
wget https://repo1.maven.org/maven2/ai/rapids/cudf/24.08.0/cudf-24.08.0-cuda12.jar
```

#### Step 4: Configure Environment Variables

```bash
# Add to ~/.bashrc or ~/.zshrc
export SPARK_HOME=/opt/spark
export PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64

# Reload shell
source ~/.bashrc
```

### Method 2: Docker Installation (Recommended for Production)

#### Step 1: Pull NVIDIA Spark Docker Image

```bash
# Pull official NVIDIA RAPIDS + Spark image
docker pull nvcr.io/nvidia/spark:24.08-cuda12.0-runtime-ubuntu22.04

# Or build custom image (see Dockerfile in repo)
cd /path/to/dgx-spark-mcp
docker build -t dgx-spark:latest .
```

#### Step 2: Run Spark Container

```bash
# Run with GPU support
docker run --gpus all \
  -v /data:/data \
  -v /opt/spark/conf:/opt/spark/conf \
  -p 4040:4040 \
  -p 8080:8080 \
  -p 7077:7077 \
  --name spark-master \
  nvcr.io/nvidia/spark:24.08-cuda12.0-runtime-ubuntu22.04
```

### Method 3: Kubernetes Deployment

For enterprise deployments, use Kubernetes with NVIDIA GPU Operator:

```bash
# Install NVIDIA GPU Operator
helm repo add nvidia https://nvidia.github.io/gpu-operator
helm install gpu-operator nvidia/gpu-operator

# Deploy Spark on K8s
kubectl apply -f k8s/spark-operator.yaml
kubectl apply -f k8s/spark-cluster.yaml
```

## Verification

### Test Spark Installation

```bash
# Start Spark shell
spark-shell

# Test basic operation
scala> val data = Seq(1, 2, 3, 4, 5)
scala> val rdd = sc.parallelize(data)
scala> rdd.count()
res0: Long = 5

scala> :quit
```

### Test GPU Acceleration

```bash
# Start Spark shell with GPU support
spark-shell \
  --master local[*] \
  --driver-memory 16g \
  --executor-memory 32g \
  --conf spark.plugins=com.nvidia.spark.SQLPlugin \
  --conf spark.rapids.sql.enabled=true \
  --conf spark.executor.resource.gpu.amount=1 \
  --conf spark.task.resource.gpu.amount=0.125

# Run GPU test
scala> import com.nvidia.spark.rapids._
scala> spark.sql("SELECT 1").show()
```

### Verify GPU Detection

```bash
# Check CUDA availability
nvidia-smi

# Check GPU visibility in Spark
spark-submit \
  --class org.apache.spark.examples.SparkPi \
  --master local[*] \
  --conf spark.executor.resource.gpu.amount=1 \
  $SPARK_HOME/examples/jars/spark-examples_2.12-3.5.0.jar 100
```

## Post-Installation Configuration

### Configure Spark Defaults

Create `/opt/spark/conf/spark-defaults.conf`:

```properties
# RAPIDS Accelerator
spark.plugins                           com.nvidia.spark.SQLPlugin
spark.rapids.sql.enabled                true
spark.rapids.sql.concurrentGpuTasks     2

# GPU Resources
spark.executor.resource.gpu.amount      1
spark.task.resource.gpu.amount          0.125
spark.executor.resource.gpu.discoveryScript  /opt/spark/getGpusResources.sh

# Memory Configuration
spark.executor.memory                   64g
spark.driver.memory                     32g
spark.executor.memoryOverhead           16g

# Network Configuration
spark.network.timeout                   800s
spark.executor.heartbeatInterval        60s

# Shuffle Configuration
spark.sql.shuffle.partitions            200
spark.default.parallelism               200
```

### Set up GPU Discovery Script

Create `/opt/spark/getGpusResources.sh`:

```bash
#!/bin/bash
nvidia-smi --query-gpu=index --format=csv,noheader | \
  awk '{print "{\"name\": \"gpu\", \"addresses\": [\""$1"\"]}"}'
```

```bash
chmod +x /opt/spark/getGpusResources.sh
```

## Cluster Setup

### Single Node (All-in-One)

```bash
# Start master
$SPARK_HOME/sbin/start-master.sh

# Start worker with GPUs
$SPARK_HOME/sbin/start-worker.sh spark://$(hostname):7077 \
  --cores 64 \
  --memory 256g
```

### Multi-Node Cluster

On master node:

```bash
# Configure workers in conf/workers
echo "dgx-worker-1" >> /opt/spark/conf/workers
echo "dgx-worker-2" >> /opt/spark/conf/workers
echo "dgx-worker-3" >> /opt/spark/conf/workers

# Start cluster
$SPARK_HOME/sbin/start-all.sh
```

On each worker node:

```bash
# Start worker pointing to master
$SPARK_HOME/sbin/start-worker.sh spark://dgx-master:7077
```

## Troubleshooting

### Issue: GPUs Not Detected

**Solution:**
```bash
# Check CUDA installation
nvcc --version

# Check driver
nvidia-smi

# Verify Spark GPU config
spark-submit --conf spark.executor.resource.gpu.amount=1 --dry-run
```

### Issue: Out of Memory Errors

**Solution:**
Increase executor memory and adjust partition count:
```bash
spark-submit \
  --executor-memory 128g \
  --driver-memory 64g \
  --conf spark.sql.shuffle.partitions=400
```

### Issue: RAPIDS Plugin Not Loading

**Solution:**
Verify JAR files are in classpath:
```bash
ls -la $SPARK_HOME/jars/rapids-4-spark*.jar
ls -la $SPARK_HOME/jars/cudf*.jar
```

## Next Steps

- [Configuration Guide](configuration.md) - Optimize Spark settings for DGX
- [Performance Tuning](tuning.md) - Advanced tuning for GPU acceleration
- [Best Practices](best-practices.md) - Production deployment recommendations

## References

- [Apache Spark Documentation](https://spark.apache.org/docs/latest/)
- [RAPIDS Accelerator Documentation](https://nvidia.github.io/spark-rapids/)
- [NVIDIA DGX Platform Guide](https://docs.nvidia.com/dgx/)
