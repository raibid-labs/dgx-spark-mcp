#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Documentation System CLI
 * Command-line interface for testing documentation features
 * DGX-Spark MCP Server - Workstream 4
 */

import { buildIndex, initializeSearch, search, getDocument, listAllDocs, getStats } from './api.js';

interface SearchResult {
  title: string;
  score: number;
  category: string;
  excerpt: string;
}

interface DocResult {
  success: boolean;
  data?: {
    metadata: {
      title: string;
      category: string;
      tags?: string[];
    };
    content: string;
  };
  error?: string;
}

interface ListResult {
  success: boolean;
  data?: Array<{
    title: string;
    id: string;
    category: string;
  }>;
  metadata?: {
    totalResults: number;
  };
  error?: string;
}

interface StatsResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  console.log('DGX-Spark Documentation System CLI\n');

  try {
    switch (command) {
      case 'build':
        console.log('Building documentation index...');
        const stats = await buildIndex('docs');
        console.log('\nIndex built successfully!');
        console.log(JSON.stringify(stats, null, 2));
        break;

      case 'search':
        if (args.length === 0) {
          console.error('Usage: cli.ts search <query>');
          process.exit(1);
        }
        console.log(`Searching for: "${args.join(' ')}"\n`);
        await initializeSearch();
        const results = (await search(args.join(' '))) as SearchResult[];
        if (results.length === 0) {
          console.log('No results found.');
        } else {
          console.log(`Found ${results.length} results:\n`);
          results.forEach((result, index: number) => {
            console.log(`${index + 1}. ${result.title} (score: ${result.score.toFixed(2)})`);
            console.log(`   Category: ${result.category}`);
            console.log(`   ${result.excerpt}`);
            console.log('');
          });
        }
        break;

      case 'get':
        if (args.length === 0 || !args[0]) {
          console.error('Usage: cli.ts get <doc-id>');
          process.exit(1);
        }
        console.log(`Getting document: ${args[0]}\n`);
        const doc = (await getDocument(args[0])) as DocResult;
        if (doc.success && doc.data) {
          console.log(`Title: ${doc.data.metadata.title}`);
          console.log(`Category: ${doc.data.metadata.category}`);
          console.log(`Tags: ${doc.data.metadata.tags?.join(', ')}`);
          console.log('\nContent:');
          console.log(doc.data.content);
        } else {
          console.error(`Error: ${doc.error}`);
        }
        break;

      case 'list':
        console.log('Listing all documents...\n');
        const list = (await listAllDocs()) as ListResult;
        if (list.success && list.data) {
          console.log(`Total documents: ${list.metadata?.totalResults}\n`);
          list.data.forEach((docItem) => {
            console.log(`- ${docItem.title}`);
            console.log(`  ID: ${docItem.id}`);
            console.log(`  Category: ${docItem.category}`);
            console.log('');
          });
        } else {
          console.error(`Error: ${list.error}`);
        }
        break;

      case 'stats':
        console.log('Getting documentation statistics...\n');
        const statsResult = (await getStats()) as StatsResult;
        if (statsResult.success) {
          console.log(JSON.stringify(statsResult.data, null, 2));
        } else {
          console.error(`Error: ${statsResult.error}`);
        }
        break;

      case 'help':
      default:
        console.log('Usage: cli.ts <command> [args]\n');
        console.log('Commands:');
        console.log('  build           - Build documentation index');
        console.log('  search <query>  - Search documentation');
        console.log('  get <doc-id>    - Get document by ID');
        console.log('  list            - List all documents');
        console.log('  stats           - Show documentation statistics');
        console.log('  help            - Show this help message');
        break;
    }
  } catch (error: unknown) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
