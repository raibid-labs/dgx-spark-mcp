/**
 * Utility functions for parsing and formatting data sizes.
 */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const UNIT_MULTIPLIERS: Record<string, number> = {};

UNITS.forEach((unit, index) => {
  UNIT_MULTIPLIERS[unit] = Math.pow(1024, index);
});

/**
 * Parses a data size string into bytes.
 * Supported units: B, KB, MB, GB, TB, PB, EB
 * Case insensitive.
 *
 * @param size - The data size string (e.g., "1.5 GB", "1024MB")
 * @returns The size in bytes
 * @throws Error if the format is invalid or negative
 */
export function parseDataSize(size: string): number {
  if (!size) {
    throw new Error('Invalid data size: empty string');
  }

  const trimmed = size.trim();
  // Match number part and optional unit part
  // Regex: start, optional minus (for negative check later), digits/decimal/scientific, optional spaces, optional unit, end
  const match = trimmed.match(/^(-?[\d.]+(?:[eE][+-]?\d+)?)\s*([a-zA-Z]*)$/);

  if (!match) {
    throw new Error(`Invalid data size format: ${size}`);
  }

  const valueStr = match[1];
  const unitStr = match[2] ? match[2].toUpperCase() : '';

  if (!valueStr) {
    throw new Error(`Invalid numeric value`);
  }

  const value = parseFloat(valueStr);

  if (isNaN(value)) {
    throw new Error(`Invalid numeric value: ${valueStr}`);
  }

  if (value < 0) {
    throw new Error(`Data size cannot be negative: ${size}`);
  }

  if (!unitStr) {
    return value; // Default to bytes if no unit
  }

  const multiplier = UNIT_MULTIPLIERS[unitStr];
  if (!multiplier) {
    throw new Error(`Unknown unit: ${unitStr}`);
  }

  return value * multiplier;
}

/**
 * Formats bytes into a human-readable string with units.
 *
 * @param bytes - The number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string (e.g., "1.50 GB")
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Handle cases where bytes might be very large but fit in the last unit
  const index = Math.min(i, UNITS.length - 1);

  const value = bytes / Math.pow(k, index);

  // If it's bytes (index 0), we usually don't want decimals unless requested?
  // The test expects '100 B' for 100, not '100.00 B'.
  // But for '1024' it expects '1.00 KB'.

  if (index === 0) {
    return `${value} ${UNITS[index]}`;
  }

  return `${value.toFixed(dm)} ${UNITS[index]}`;
}

/**
 * Converts bytes to a human-readable string.
 * Alias for formatBytes with default decimals, but ensures consistent output format.
 *
 * @param bytes - The number of bytes
 * @returns Human readable string
 */
export function bytesToHuman(bytes: number): string {
  return formatBytes(bytes);
}
