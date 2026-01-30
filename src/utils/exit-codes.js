/**
 * Standard Unix exit codes
 * Following BSD sysexits.h conventions
 */

export const EXIT_CODES = {
  // Success
  SUCCESS: 0,

  // General errors
  ERROR: 1,           // General error
  USAGE: 2,           // Command line usage error

  // BSD sysexits.h codes
  DATAERR: 65,        // Data format error
  NOINPUT: 66,        // Cannot open input
  NOUSER: 67,         // Addressee unknown
  NOHOST: 68,         // Host name unknown
  UNAVAILABLE: 69,    // Service unavailable
  SOFTWARE: 70,       // Internal software error
  OSERR: 71,          // System error
  OSFILE: 72,         // Critical OS file missing
  CANTCREAT: 73,      // Can't create output file
  IOERR: 74,          // Input/output error
  TEMPFAIL: 75,       // Temporary failure
  PROTOCOL: 76,       // Remote error in protocol
  NOPERM: 77,         // Permission denied
  CONFIG: 78,         // Configuration error
};

/**
 * Exit with code and optional message to stderr
 */
export function exitWithCode(code, message = null) {
  if (message) {
    console.error(message);
  }
  process.exit(code);
}

/**
 * Exit with success
 */
export function exitSuccess() {
  process.exit(EXIT_CODES.SUCCESS);
}

/**
 * Exit with general error
 */
export function exitError(message) {
  console.error(`Error: ${message}`);
  process.exit(EXIT_CODES.ERROR);
}

/**
 * Exit with usage error
 */
export function exitUsage(message) {
  console.error(`Usage error: ${message}`);
  process.exit(EXIT_CODES.USAGE);
}

/**
 * Exit with file error
 */
export function exitFileError(message, canRead = true) {
  console.error(`File error: ${message}`);
  process.exit(canRead ? EXIT_CODES.CANTCREAT : EXIT_CODES.NOINPUT);
}

/**
 * Exit with config error
 */
export function exitConfigError(message) {
  console.error(`Configuration error: ${message}`);
  process.exit(EXIT_CODES.CONFIG);
}
