import fs from 'fs/promises';

/**
 * Unix stdio utilities
 * Handle stdin/stdout with `-` convention
 */

/**
 * Read from file or stdin
 * @param {string} path - File path or '-' for stdin
 * @returns {Promise<string>} File contents
 */
export async function readInput(path) {
  if (path === '-') {
    // Read from stdin
    return readStdin();
  } else {
    // Read from file
    return await fs.readFile(path, 'utf-8');
  }
}

/**
 * Write to file or stdout
 * @param {string} path - File path or '-' for stdout
 * @param {string|Buffer} data - Data to write
 */
export async function writeOutput(path, data) {
  if (path === '-') {
    // Write to stdout
    process.stdout.write(data);
  } else {
    // Write to file
    if (typeof data === 'string') {
      await fs.writeFile(path, data, 'utf-8');
    } else {
      await fs.writeFile(path, data);
    }
  }
}

/**
 * Read from stdin
 * @returns {Promise<string>}
 */
export function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';

    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', chunk => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data);
    });

    process.stdin.on('error', err => {
      reject(err);
    });

    // Handle case where stdin is empty/closed
    if (process.stdin.isTTY) {
      reject(new Error('No input from stdin (pipe data or use a file)'));
    }
  });
}

/**
 * Check if running in a pipe
 */
export function isPiped() {
  return !process.stdin.isTTY || !process.stdout.isTTY;
}

/**
 * Check if stdin has data
 */
export function hasStdin() {
  return !process.stdin.isTTY;
}

/**
 * Check if stdout is redirected
 */
export function isStdoutRedirected() {
  return !process.stdout.isTTY;
}
