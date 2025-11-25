/**
 * MCP Test Client Helper
 * Provides utilities for testing MCP protocol compliance
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

/**
 * Test MCP client that can interact with the server
 */
export class TestMCPClient {
  private server: Server;
  private client: Client;
  private connected: boolean = false;

  constructor(server: Server) {
    this.server = server;
    this.client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  async ensureConnected() {
    if (this.connected) return;

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await this.server.connect(serverTransport);
    await this.client.connect(clientTransport);
    this.connected = true;
  }

  /**
   * List all available resources
   */
  async listResources(): Promise<any> {
    await this.ensureConnected();
    return this.client.listResources({});
  }

  /**
   * Read a resource by URI
   */
  async readResource(uri: string): Promise<any> {
    await this.ensureConnected();
    return this.client.readResource({ uri });
  }

  /**
   * List all available tools
   */
  async listTools(): Promise<any> {
    await this.ensureConnected();
    return this.client.listTools({});
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: Record<string, any>): Promise<any> {
    await this.ensureConnected();
    return this.client.callTool({
      name,
      arguments: args,
    });
  }

  /**
   * Get server capabilities
   * Simulates the initialize response structure
   */
  async getCapabilities(): Promise<any> {
    await this.ensureConnected();

    return {
      protocolVersion: '2024-11-05',
      capabilities: this.client.getServerCapabilities(),
      serverInfo: this.client.getServerVersion(),
    };
  }
}

import { DGXSparkMCPServer } from '../../src/server.js';
import { getConfig, resetConfig } from '../../src/config/index.js';
import { Logger } from '../../src/logger/index.js';

/**
 * Create a test MCP server instance
 */
export async function createTestServer(): Promise<Server> {
  // Reset config to ensure clean state
  resetConfig();
  const config = getConfig();

  // Set log level to 'error' for tests to reduce noise
  config.logging.level = 'error';

  // Override server name for tests
  config.mcp.serverName = 'dgx-spark-mcp-test';

  // Initialize logger
  const logger = new Logger(config.logging);

  // Initialize server with all handlers
  const dgxServer = new DGXSparkMCPServer(config, logger);

  return dgxServer.getServer();
}

/**
 * Wait for server to be ready
 */
export async function waitForServerReady(server: Server, timeout = 5000): Promise<void> {
  // No-op with in-memory transport
}

/**
 * Mock hardware detection for testing
 */
export function mockHardwareDetection() {
  process.env['MOCK_HARDWARE'] = 'true';
  process.env['DGX_MCP_NVIDIA_SMI_PATH'] = '/usr/bin/nvidia-smi';
}

/**
 * Clean up test environment
 */
export function cleanupTestEnvironment() {
  delete process.env['MOCK_HARDWARE'];
}
