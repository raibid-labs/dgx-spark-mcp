# Configuration Guide

This guide explains how to configure the DGX Spark MCP Server for your environment.

## Table of Contents

- [MCP Client Configuration](#mcp-client-configuration)
- [Server Configuration](#server-configuration)
- [Environment Variables](#environment-variables)
- [Advanced Configuration](#advanced-configuration)
- [Configuration Examples](#configuration-examples)

## MCP Client Configuration

### Claude Desktop

Add the server to your `claude_desktop_config.json`:

**Location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**Basic Configuration:**
```json
{
  "mcpServers": {
    "dgx-spark": {
      "command": "dgx-spark-mcp"
    }
  }
}
```

**With Custom Config File:**
```json
{
  "mcpServers": {
    "dgx-spark": {
      "command": "dgx-spark-mcp",
      "env": {
        "DGX_MCP_CONFIG": "/path/to/config/local.json"
      }
    }
  }
}
```

**From Source (Development):**
```json
{
  "mcpServers": {
    "dgx-spark": {
      "command": "node",
      "args": ["/path/to/dgx-spark-mcp/dist/index.js"]
    }
  }
}
```

### Claude Code (CLI)

Add to your MCP settings:

```json
{
  "mcpServers": {
    "dgx-spark": {
      "command": "dgx-spark-mcp"
    }
  }
}
```

## Server Configuration

### Configuration File

Create a configuration file at `config/local.json`:

```json
{
  "mcp": {
    "serverName": "dgx-spark-mcp",
    "serverVersion": "0.1.0",
    "transport": "stdio"
  },
  "logging": {
    "level": "info",
    "enableConsole": true,
    "enableFile": true,
    "directory": "logs",
    "maxFiles": 10,
    "maxSize": "10m"
  },
  "hardware": {
    "cacheDuration": 3600000,
    "enableGPUMonitoring": true,
    "gpuUpdateInterval": 5000,
    "mockHardware": false
  },
  "docs": {
    "indexPath": "docs/index.json",
    "autoRebuild": true,
    "rebuildInterval": 3600000,
    "enableSearch": true
  },
  "spark": {
    "enableValidation": true,
    "enableOptimization": true,
    "defaultExecutorMemory": "4g",
    "defaultDriverMemory": "2g"
  }
}
```

### Configuration Hierarchy

Configuration is loaded in the following order (later sources override earlier ones):

1. **Default configuration** (`src/config/defaults.ts`)
2. **Environment-specific config** (`config/production.json`, `config/development.json`)
3. **Local configuration** (`config/local.json`)
4. **Environment variables**

### Configuration Options

#### MCP Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mcp.serverName` | string | `"dgx-spark-mcp"` | Server name |
| `mcp.serverVersion` | string | Package version | Server version |
| `mcp.transport` | string | `"stdio"` | Communication transport |

#### Logging Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logging.level` | string | `"info"` | Log level (error, warn, info, debug) |
| `logging.enableConsole` | boolean | `true` | Enable console logging |
| `logging.enableFile` | boolean | `true` | Enable file logging |
| `logging.directory` | string | `"logs"` | Log file directory |
| `logging.maxFiles` | number | `10` | Maximum log files to keep |
| `logging.maxSize` | string | `"10m"` | Maximum size per log file |

#### Hardware Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hardware.cacheDuration` | number | `3600000` | Hardware cache duration (ms) |
| `hardware.enableGPUMonitoring` | boolean | `true` | Enable GPU monitoring |
| `hardware.gpuUpdateInterval` | number | `5000` | GPU stats update interval (ms) |
| `hardware.mockHardware` | boolean | `false` | Use mock hardware data |

#### Documentation Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `docs.indexPath` | string | `"docs/index.json"` | Documentation index path |
| `docs.autoRebuild` | boolean | `true` | Auto-rebuild index |
| `docs.rebuildInterval` | number | `3600000` | Rebuild interval (ms) |
| `docs.enableSearch` | boolean | `true` | Enable search functionality |

#### Spark Settings

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `spark.enableValidation` | boolean | `true` | Enable config validation |
| `spark.enableOptimization` | boolean | `true` | Enable auto-optimization |
| `spark.defaultExecutorMemory` | string | `"4g"` | Default executor memory |
| `spark.defaultDriverMemory` | string | `"2g"` | Default driver memory |

## Environment Variables

Environment variables can override configuration file settings:

| Variable | Description | Example |
|----------|-------------|---------|
| `DGX_MCP_CONFIG` | Path to config file | `/etc/dgx-mcp/config.json` |
| `LOG_LEVEL` | Logging level | `debug` |
| `MOCK_HARDWARE` | Use mock hardware | `true` |
| `NODE_ENV` | Environment | `production` |
| `GPU_CACHE_DURATION` | GPU cache duration (ms) | `3600000` |

**Example:**
```bash
export LOG_LEVEL=debug
export MOCK_HARDWARE=true
dgx-spark-mcp
```

## Advanced Configuration

### Production Configuration

`config/production.json`:
```json
{
  "logging": {
    "level": "warn",
    "enableConsole": false,
    "enableFile": true,
    "maxFiles": 30,
    "maxSize": "50m"
  },
  "hardware": {
    "cacheDuration": 7200000,
    "gpuUpdateInterval": 10000
  },
  "docs": {
    "autoRebuild": false
  }
}
```

### Development Configuration

`config/development.json`:
```json
{
  "logging": {
    "level": "debug",
    "enableConsole": true,
    "enableFile": true
  },
  "hardware": {
    "mockHardware": true,
    "cacheDuration": 60000
  },
  "docs": {
    "autoRebuild": true,
    "rebuildInterval": 600000
  }
}
```

### Mock Hardware Configuration

For development without GPU hardware:

```json
{
  "hardware": {
    "mockHardware": true,
    "mockConfig": {
      "gpuCount": 8,
      "gpuModel": "NVIDIA A100-SXM4-80GB",
      "totalMemory": 671088640,
      "nvlinkEnabled": true
    }
  }
}
```

Or use environment variable:
```bash
MOCK_HARDWARE=true dgx-spark-mcp
```

### Systemd Service Configuration

For production deployment with systemd:

`/etc/systemd/system/dgx-spark-mcp.service`:
```ini
[Unit]
Description=DGX Spark MCP Server
After=network.target

[Service]
Type=simple
User=dgx-mcp
WorkingDirectory=/opt/dgx-spark-mcp
Environment="NODE_ENV=production"
Environment="DGX_MCP_CONFIG=/etc/dgx-mcp/config.json"
ExecStart=/usr/bin/dgx-spark-mcp
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Configuration Examples

### Minimal Configuration

```json
{
  "mcp": {
    "serverName": "dgx-spark"
  }
}
```

### Development with Debug Logging

```json
{
  "logging": {
    "level": "debug",
    "enableConsole": true
  },
  "hardware": {
    "mockHardware": true
  }
}
```

### Production with File Logging Only

```json
{
  "logging": {
    "level": "warn",
    "enableConsole": false,
    "enableFile": true,
    "directory": "/var/log/dgx-spark-mcp",
    "maxFiles": 50,
    "maxSize": "100m"
  },
  "hardware": {
    "cacheDuration": 7200000,
    "gpuUpdateInterval": 15000
  }
}
```

### Custom Spark Defaults

```json
{
  "spark": {
    "defaultExecutorMemory": "8g",
    "defaultDriverMemory": "4g",
    "defaultExecutorCores": 4,
    "enableValidation": true,
    "enableOptimization": true
  }
}
```

## Validation

Validate your configuration:

```bash
# Using npm script
npm run validate-config

# Using justfile
just validate-config

# Manually
node dist/config/validate.js
```

## Troubleshooting

### Configuration Not Loading

1. Check file path and permissions
2. Verify JSON syntax
3. Check environment variables
4. Review logs for errors

### Mock Hardware Not Working

```bash
# Ensure environment variable is set
export MOCK_HARDWARE=true

# Or in config file
{
  "hardware": {
    "mockHardware": true
  }
}
```

### Logging Issues

```bash
# Check log directory exists and is writable
mkdir -p logs
chmod 755 logs

# Verify logging configuration
{
  "logging": {
    "enableFile": true,
    "directory": "logs"
  }
}
```

## See Also

- [Installation Guide](../README.md#installation)
- [Development Guide](development.md)
- [Architecture Overview](architecture/overview.md)
