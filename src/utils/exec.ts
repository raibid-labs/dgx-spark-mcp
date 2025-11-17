/**
 * Utilities for executing system commands
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute a command and return the result
 */
export async function executeCommand(
  command: string,
  options?: { timeout?: number; cwd?: string }
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: options?.timeout || 30000,
      cwd: options?.cwd,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    return {
      stdout: stdout ? stdout.trim() : '',
      stderr: stderr ? stderr.trim() : '',
      exitCode: 0,
    };
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; message?: string; code?: number };
    return {
      stdout: err.stdout ? err.stdout.trim() : '',
      stderr: err.stderr ? err.stderr.trim() : err.message || '',
      exitCode: err.code || 1,
    };
  }
}

/**
 * Check if a command exists in PATH
 */
export async function commandExists(command: string): Promise<boolean> {
  const result = await executeCommand(`which ${command}`);
  return result.exitCode === 0;
}

/**
 * Parse CSV output from command
 */
export function parseCSV(output: string, hasHeader = true): (Record<string, string> | string[])[] {
  const lines = output.split('\n').filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  const rows: (Record<string, string> | string[])[] = [];
  let headers: string[] = [];

  const startIndex = hasHeader ? 1 : 0;
  if (hasHeader && lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine) {
      headers = firstLine.split(',').map((h) => h.trim());
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const values = line.split(',').map((v) => v.trim());

    if (hasHeader) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    } else {
      rows.push(values);
    }
  }

  return rows;
}

/**
 * Parse simple key-value output (key: value format)
 */
export function parseKeyValue(output: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = output.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      map.set(key, value);
    }
  }

  return map;
}
