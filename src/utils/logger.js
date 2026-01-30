import chalk from 'chalk';

/**
 * Logger that respects quiet/verbose modes
 * Errors always go to stderr
 * Info/progress respect flags
 */

let isQuiet = false;
let isVerbose = false;

export function setQuiet(value) {
  isQuiet = value;
}

export function setVerbose(value) {
  isVerbose = value;
}

/**
 * Info - normal output, suppressed in quiet mode
 */
export function info(message) {
  if (!isQuiet) {
    console.log(message);
  }
}

/**
 * Verbose - only in verbose mode
 */
export function verbose(message) {
  if (isVerbose) {
    console.log(chalk.gray(message));
  }
}

/**
 * Success - always shown unless quiet
 */
export function success(message) {
  if (!isQuiet) {
    console.log(chalk.green(message));
  }
}

/**
 * Warning - to stderr, unless quiet
 */
export function warn(message) {
  if (!isQuiet) {
    console.error(chalk.yellow(`Warning: ${message}`));
  }
}

/**
 * Error - always to stderr
 */
export function error(message) {
  console.error(chalk.red(`Error: ${message}`));
}

/**
 * Progress - to stderr, suppressed in quiet
 */
export function progress(message) {
  if (!isQuiet) {
    process.stderr.write(message);
  }
}

/**
 * Clear progress line
 */
export function clearProgress() {
  if (!isQuiet) {
    process.stderr.write('\r\x1b[K');
  }
}

/**
 * Section header
 */
export function section(title) {
  if (!isQuiet) {
    console.log(chalk.cyan(`\n${title}\n`));
  }
}

/**
 * Data output - to stdout, never suppressed
 * Use for actual program output (JSON, text, etc)
 */
export function output(data) {
  console.log(data);
}
