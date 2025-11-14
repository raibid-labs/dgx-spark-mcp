import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Logger } from './logger/index.js';
import type { Config } from './config/schema.js';
import { LifecycleManager } from './lifecycle/index.js';
import { HealthManager, HealthStatus } from './health/index.js';
import type { DGXMCPServer } from './types/mcp.js';

/**
 * DGX Spark MCP Server
 * Main server class that coordinates all MCP protocol operations
 */
export class DGXSparkMCPServer {
  private server: Server;
  private logger: Logger;
  private config: Config;
  private lifecycle: LifecycleManager;
  private health: HealthManager;
  private transport?: StdioServerTransport;

  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Initialize MCP server
    this.server = new Server(
      {
        name: config.mcp.serverName,
        version: config.mcp.serverVersion,
      },
      {
        capabilities: {
          resources: {
            listChanged: true,
          },
          tools: {
            listChanged: true,
          },
        },
      }
    ) as DGXMCPServer;

    // Initialize lifecycle manager
    this.lifecycle = new LifecycleManager(logger);

    // Initialize health manager
    this.health = new HealthManager(logger);

    // Setup lifecycle hooks
    this.setupLifecycleHooks();

    // Setup health checks
    this.setupHealthChecks();

    // Setup MCP handlers
    this.setupMCPHandlers();
  }

  /**
   * Setup lifecycle hooks
   */
  private setupLifecycleHooks(): void {
    // Startup hooks
    this.lifecycle.onStartup('initialize-server', async () => {
      this.logger.info('Initializing MCP server', {
        name: this.config.mcp.serverName,
        version: this.config.mcp.serverVersion,
      });
    });

    this.lifecycle.onStartup('start-health-checks', async () => {
      if (this.config.performance.enableMetrics) {
        this.health.startPeriodicChecks(this.config.performance.healthCheckInterval);
      }
    });

    // Shutdown hooks
    this.lifecycle.onShutdown('stop-health-checks', async () => {
      this.health.stopPeriodicChecks();
    });

    this.lifecycle.onShutdown('close-transport', async () => {
      if (this.transport) {
        this.logger.info('Closing MCP transport');
        await this.transport.close();
      }
    });
  }

  /**
   * Setup health checks
   */
  private setupHealthChecks(): void {
    // Server alive check
    this.health.registerCheck(
      'server-alive',
      async () => ({
        status: HealthStatus.HEALTHY,
        message: 'Server is alive',
      }),
      true
    );

    // Configuration check
    this.health.registerCheck(
      'configuration',
      async () => ({
        status: HealthStatus.HEALTHY,
        message: 'Configuration loaded',
        metadata: {
          serverName: this.config.mcp.serverName,
          serverVersion: this.config.mcp.serverVersion,
        },
      }),
      true
    );
  }

  /**
   * Setup MCP protocol handlers
   */
  private setupMCPHandlers(): void {
    // List resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      this.logger.debug('Received list_resources request');

      return {
        resources: [
          {
            uri: 'dgx://server/info',
            name: 'Server Information',
            description: 'Basic server information and capabilities',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      this.logger.debug('Received read_resource request', { uri: request.params.uri });

      const uri = request.params.uri;

      if (uri === 'dgx://server/info') {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  name: this.config.mcp.serverName,
                  version: this.config.mcp.serverVersion,
                  capabilities: {
                    resources: true,
                    tools: true,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });

    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug('Received list_tools request');

      return {
        tools: [
          {
            name: 'health_check',
            description: 'Check server health status',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      this.logger.debug('Received call_tool request', { tool: request.params.name });

      const toolName = request.params.name;

      if (toolName === 'health_check') {
        const health = await this.health.check();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(health, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${toolName}`);
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    try {
      // Execute startup hooks
      await this.lifecycle.startup();

      // Create and connect transport based on configuration
      if (this.config.mcp.transport === 'stdio') {
        this.logger.info('Starting MCP server with stdio transport');
        this.transport = new StdioServerTransport();
        await this.server.connect(this.transport);
        this.logger.info('MCP server started successfully');
      } else {
        throw new Error(`Unsupported transport: ${this.config.mcp.transport}`);
      }
    } catch (error) {
      this.logger.error('Failed to start MCP server', error as Error);
      throw error;
    }
  }

  /**
   * Get server instance
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Get health manager
   */
  getHealth(): HealthManager {
    return this.health;
  }

  /**
   * Get lifecycle manager
   */
  getLifecycle(): LifecycleManager {
    return this.lifecycle;
  }
}
