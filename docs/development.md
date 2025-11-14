# DGX Spark MCP Server - Development Guide

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- TypeScript knowledge
- Understanding of Model Context Protocol (MCP)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Development Mode

Run the server with hot reload:

```bash
npm run dev
```

The server will automatically restart when you make changes to the source code.

### 3. Build for Production

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### 4. Run Production Build

```bash
npm start
```

## Project Structure

```
dgx-spark-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server implementation
│   ├── config/               # Configuration system
│   │   ├── index.ts          # Config loader
│   │   ├── schema.ts         # Zod schemas
│   │   └── defaults.ts       # Default values
│   ├── logger/               # Logging system
│   │   └── index.ts          # Winston logger
│   ├── errors/               # Error handling
│   │   ├── index.ts          # Error classes
│   │   └── types.ts          # Error types
│   ├── lifecycle/            # Lifecycle management
│   │   └── index.ts          # Startup/shutdown
│   ├── health/               # Health checks
│   │   └── index.ts          # Health manager
│   └── types/                # TypeScript types
│       └── mcp.ts            # MCP types
├── config/                   # Configuration files
│   └── default.json          # Default config
├── logs/                     # Log files
├── dist/                     # Compiled output
└── docs/                     # Documentation

```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting |
| `npm run typecheck` | Type check without emitting |
| `npm run clean` | Remove build artifacts |

## Environment Configuration

Create a `.env` file in the project root (see `.env.example`):

```bash
# Copy example
cp .env.example .env

# Edit configuration
vim .env
```

### Key Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `DGX_MCP_LOG_LEVEL` | Log level (debug/info/warn/error) | info |
| `DGX_MCP_LOG_FORMAT` | Log format (json/simple/pretty) | json |
| `DGX_MCP_TRANSPORT` | Transport type (stdio/http) | stdio |

See `.env.example` for complete list.

## Debugging

### VS Code

1. Open the project in VS Code
2. Set breakpoints in your code
3. Press F5 or use the Debug panel
4. Select "Debug MCP Server" configuration

### Command Line

```bash
# Debug with Node inspector
node --inspect-brk dist/index.js

# Debug TypeScript directly
tsx --inspect-brk src/index.ts
```

## Testing with MCP Inspector

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Test the server
npx @modelcontextprotocol/inspector dist/index.js
```

## Code Style

This project uses:
- **ESLint** for linting
- **Prettier** for formatting
- **TypeScript strict mode** for type safety

### ESLint Rules

- Strict TypeScript checking
- No `any` types
- Explicit function return types
- No unused variables

### Prettier Configuration

- Single quotes
- 2 space indentation
- 100 character line width
- Trailing commas (ES5)

## Logging

The server uses Winston for structured logging:

```typescript
import { getLogger } from './logger/index.js';

const logger = getLogger();

logger.debug('Debug message', { metadata: 'value' });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

### Log Levels

1. **debug**: Detailed debugging information
2. **info**: General informational messages
3. **warn**: Warning messages
4. **error**: Error messages

### Log Outputs

- Console (formatted based on `DGX_MCP_LOG_FORMAT`)
- `logs/dgx-mcp-combined.log` (all logs)
- `logs/dgx-mcp-error.log` (errors only)

## Error Handling

Use custom error classes from `src/errors/`:

```typescript
import { ConfigurationError, ErrorCode } from './errors/index.js';

throw new ConfigurationError(
  'Invalid configuration',
  { configKey: 'value' }
);
```

### Error Types

- `ConfigurationError` - Config issues
- `MCPError` - MCP protocol errors
- `HardwareError` - Hardware detection errors
- `SparkError` - Spark-related errors
- `ValidationError` - Input validation errors

## Lifecycle Management

The server implements graceful startup and shutdown:

```typescript
// Register startup hook
lifecycle.onStartup('my-service', async () => {
  // Initialize service
});

// Register shutdown hook
lifecycle.onShutdown('my-service', async () => {
  // Cleanup service
});
```

### Signal Handling

The server handles:
- `SIGTERM` - Graceful shutdown
- `SIGINT` - Graceful shutdown (Ctrl+C)
- `uncaughtException` - Log and shutdown
- `unhandledRejection` - Log and shutdown

## Health Checks

Register custom health checks:

```typescript
health.registerCheck(
  'my-check',
  async () => ({
    status: HealthStatus.HEALTHY,
    message: 'Service is healthy',
  }),
  true // critical
);
```

## MCP Protocol

### Resources

Implement resource handlers in `src/server.ts`:

```typescript
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  // Return resource content
});
```

### Tools

Implement tool handlers in `src/server.ts`:

```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  // Execute tool and return result
});
```

## Common Tasks

### Add a New Configuration Option

1. Update `src/config/schema.ts` - Add Zod schema
2. Update `src/config/defaults.ts` - Add default value
3. Update `src/config/index.ts` - Add env loading
4. Update `.env.example` - Document the variable

### Add a New Error Type

1. Update `src/errors/types.ts` - Add error code
2. Update `src/errors/index.ts` - Create error class

### Add a Health Check

1. Open `src/server.ts`
2. Add check in `setupHealthChecks()` method
3. Use `this.health.registerCheck()`

## Best Practices

1. **Type Safety**: Use TypeScript strict mode, avoid `any`
2. **Error Handling**: Always use custom error classes
3. **Logging**: Log at appropriate levels with context
4. **Configuration**: Use environment variables for config
5. **Graceful Shutdown**: Register cleanup in shutdown hooks
6. **Testing**: Write tests for all new functionality
7. **Documentation**: Update docs with code changes

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### TypeScript Compilation Errors

```bash
# Clean and rebuild
npm run clean
npm run build

# Check types without building
npm run typecheck
```

### Module Resolution Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Resources

- [MCP SDK Documentation](https://modelcontextprotocol.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Zod Documentation](https://zod.dev/)

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## Support

For issues and questions:
- GitHub Issues: [github.com/raibid-labs/dgx-spark-mcp/issues]
- Documentation: [/docs]
