# Testing Guide for DGX-Spark MCP Server

This document describes the comprehensive testing infrastructure for the DGX-Spark MCP Server project.

## Test Infrastructure

### Test Framework
- **Jest** with TypeScript support via ts-jest
- ES Modules configuration for modern JavaScript
- Comprehensive mocking capabilities via jest-mock-extended

### Test Organization

```
dgx-spark-mcp/
├── src/
│   ├── **/*.test.ts           # Unit tests (co-located with source)
│   ├── __tests__/
│   │   ├── setup.ts           # Global test setup
│   │   └── utils.ts           # Test utilities and helpers
│   └── __mocks__/
│       ├── child_process.ts   # Mock nvidia-smi and system commands
│       └── fs.ts              # Mock filesystem operations
├── tests/
│   ├── integration/           # Integration tests
│   │   └── mcp-protocol.test.ts
│   ├── benchmarks/            # Performance benchmarks
│   │   └── performance.test.ts
│   ├── helpers/               # Test helpers
│   │   └── mcp-client.ts      # MCP test client
│   └── fixtures/              # Test fixtures and sample data
└── jest.config.js             # Jest configuration
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

View the HTML coverage report:
```bash
open coverage/index.html
```

### Integration Tests Only
```bash
npm run test:integration
```

### Performance Benchmarks
```bash
npm run test:benchmark
```

### Specific Test File
```bash
npm test -- src/config/schema.test.ts
```

### Specific Test Suite
```bash
npm test -- --testNamePattern="Configuration Schema"
```

## Test Coverage

### Coverage Goals
- **Overall Coverage**: 80%+
- **Critical Modules**: 90%+
  - Configuration system
  - Hardware detection
  - MCP tools and resources
  - Spark optimizer

### Coverage Reports
Coverage reports are generated in multiple formats:
- **Text**: Console output
- **LCOV**: `coverage/lcov.info` (for CI/CD)
- **HTML**: `coverage/index.html` (for browsing)
- **JSON Summary**: `coverage/coverage-summary.json`

## Test Categories

### 1. Unit Tests

Unit tests are co-located with source files (`*.test.ts`) and test individual functions and classes in isolation.

**Examples:**
- `src/config/schema.test.ts` - Configuration schema validation
- `src/config/index.test.ts` - Configuration loading and environment variables
- `src/hardware/gpu.test.ts` - GPU detection logic
- `src/tools/index.test.ts` - MCP tools registry
- `src/optimizers/spark.test.ts` - Spark configuration optimizer
- `src/utils/data-size.test.ts` - Data size parsing utilities

**Key Features:**
- Fast execution (< 100ms per test)
- Complete isolation with mocks
- No external dependencies
- Comprehensive edge case coverage

### 2. Integration Tests

Integration tests validate MCP protocol compliance and end-to-end workflows.

**Location:** `tests/integration/`

**Tests:**
- MCP protocol compliance
- Resource listing and reading
- Tool invocation and validation
- Error handling across components

**Key Features:**
- Test actual MCP server interactions
- Validate JSON-RPC protocol
- Test resource URI routing
- Validate tool argument schemas

### 3. Performance Benchmarks

Performance tests ensure operations meet latency requirements.

**Location:** `tests/benchmarks/`

**Benchmarks:**
- Configuration loading: < 10ms (P95)
- Tool validation: < 5ms (P95)
- Resource URI parsing: < 1ms (P95)
- Spark config generation: < 50ms (P95)
- Workload classification: < 20ms (P95)

**Output:**
```
Configuration Loading:
  Average: 2.34ms
  Min: 1.89ms
  Max: 5.21ms
  P95: 3.45ms
```

## Test Utilities

### Hardware Mocking

For CI environments without GPUs, hardware detection is mocked:

```typescript
import { createMockGPU, createMockHardwareTopology } from '../__tests__/utils.js';

const mockGPU = createMockGPU({ index: 0 });
const topology = createMockHardwareTopology();
```

Enable mocking via environment variable:
```bash
MOCK_HARDWARE=true npm test
```

### Test Helpers

**Data Generators:**
```typescript
createMockGPU()           // Create mock GPU info
createMockCPU()           // Create mock CPU info
createMockMemory()        // Create mock memory info
createMockStorage()       // Create mock storage info
createMockNetwork()       // Create mock network info
createMockHardwareTopology() // Complete hardware topology
```

**Async Utilities:**
```typescript
waitFor(condition, timeout)        // Wait for async condition
withEnv(envVars, fn)               // Run with env variables
withEnvAsync(envVars, asyncFn)     // Async version
```

### Custom Matchers

```typescript
expect(config).toBeValidSparkConfig();
```

## Writing Tests

### Best Practices

1. **Descriptive Test Names**
   ```typescript
   it('should parse GB with decimal values', () => {
     expect(parseDataSize('1.5GB')).toBe(1.5 * 1024 ** 3);
   });
   ```

2. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should validate required fields', () => {
     // Arrange
     const schema = getToolSchema('search_documentation');
     const args = { limit: 10 }; // Missing 'query'

     // Act
     const result = validateToolArgs(schema, args);

     // Assert
     expect(result.success).toBe(false);
     expect(result.errors).toContain('query is required');
   });
   ```

3. **Test Edge Cases**
   ```typescript
   it('should handle empty input', () => {
     expect(() => parseDataSize('')).toThrow();
   });

   it('should handle very large numbers', () => {
     expect(parseDataSize('100PB')).toBe(100 * 1024 ** 5);
   });
   ```

4. **Use Mocks for External Dependencies**
   ```typescript
   jest.mock('./nvidia-smi.js');
   const mockQueryGPUs = queryGPUs as jest.MockedFunction<typeof queryGPUs>;
   mockQueryGPUs.mockResolvedValue([mockGPU]);
   ```

5. **Clean Up After Tests**
   ```typescript
   afterEach(() => {
     jest.clearAllMocks();
     resetConfig();
   });
   ```

## Continuous Integration

### GitHub Actions Workflow

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Manual workflow dispatch

**Workflow includes:**
- Install dependencies
- Run linter
- Run type checker
- Run all tests with coverage
- Upload coverage reports
- Fail on coverage < 80%

### Local Pre-commit

Before committing, run:
```bash
npm run typecheck  # Verify types
npm run lint       # Check code style
npm test           # Run all tests
```

## Debugging Tests

### Run Single Test in Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest src/config/schema.test.ts
```

### VS Code Debug Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal"
}
```

### Verbose Output
```bash
npm test -- --verbose
```

### Only Failed Tests
```bash
npm test -- --onlyFailures
```

## Mock Hardware Output

### nvidia-smi Mock

The `src/__mocks__/child_process.ts` provides mock nvidia-smi output simulating:
- 4x NVIDIA A100-SXM4-80GB GPUs
- Ampere architecture
- 80GB memory per GPU
- NVLink topology
- Temperature, power, and utilization metrics

### System Info Mocks

- **CPU**: AMD EPYC 7742 64-Core (128 logical cores)
- **Memory**: 1TB RAM
- **Storage**: 3.5TB NVMe SSD
- **Network**: 100Gbps Ethernet + 200Gbps InfiniBand

## Test Data Fixtures

Test fixtures are stored in `tests/fixtures/`:
- Sample Spark configurations
- Example hardware topologies
- Documentation excerpts
- Workload descriptions

## Troubleshooting

### ESM Module Errors
Ensure `NODE_OPTIONS=--experimental-vm-modules` is set:
```bash
export NODE_OPTIONS=--experimental-vm-modules
npm test
```

### Mock Not Working
Clear Jest cache:
```bash
npx jest --clearCache
npm test
```

### Timeout Errors
Increase timeout in jest.config.js or specific test:
```typescript
it('long running test', async () => {
  // test code
}, 30000); // 30 second timeout
```

### Coverage Not Updating
Clean and rebuild:
```bash
npm run clean
npm run build
npm run test:coverage
```

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure coverage doesn't drop below 80%
3. Add integration tests for new MCP resources/tools
4. Update this documentation if adding new test patterns

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [MCP Specification](https://github.com/modelcontextprotocol/specification)
