const fs = require('fs');
const util = require('util');
const path = require('path');

class Logger {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            logLevel: options.logLevel || 'debug',
            logDir: options.logDir || './logs',
            logFiles: {
                all: options.logFiles?.all || 'app.log',
                error: options.logFiles?.error || 'errors.log',
                debug: options.logFiles?.debug || 'debug.log'
            },
            colors: {
                error: '\x1b[31m', // Red
                warn: '\x1b[33m',  // Yellow
                info: '\x1b[32m',  // Green
                debug: '\x1b[36m', // Cyan
                reset: '\x1b[0m'   // Reset colors
            }
        };

        // Log severity levels
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };

        // Ensure log directory exists
        if (!fs.existsSync(this.config.logDir)) {
            fs.mkdirSync(this.config.logDir, { recursive: true });
        }

        // Create file streams
        this.streams = {
            all: fs.createWriteStream(
                path.join(this.config.logDir, this.config.logFiles.all),
                { flags: 'a' }
            ),
            error: fs.createWriteStream(
                path.join(this.config.logDir, this.config.logFiles.error),
                { flags: 'a' }
            ),
            debug: fs.createWriteStream(
                path.join(this.config.logDir, this.config.logFiles.debug),
                { flags: 'a' }
            )
        };
    }

    #shouldLog(level) {
        return this.levels[level] || null ;
    }

    #log(level, message) {
        if (!this.#shouldLog(level))
            return false;

        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
        const colored = `${this.config.colors[level]}${formatted}${this.config.colors.reset}`;

        // Console output (colored)
        process.stdout.write(colored);

        // File output (plain text)
        this.streams.all.write(formatted);
        if (level === 'error') {
            this.streams.error.write(formatted);
        }
        if (level === 'debug') {
            this.streams.debug.write(formatted);
        }
    }

    // Public logging methods
    err(message) {
        this.#log('error', util.format(message));
    }

    warn(message) {
        this.#log('warn', util.format(message));
    }

    info(message) {
        this.#log('info', util.format(message));
    }

    debug(message) {
        this.#log('debug', util.format(message));
    }

    // Close file streams gracefully
    close() {
        this.streams.all.end();
        this.streams.error.end();
        this.streams.debug.end();
    }
}

// Example usage
// const logger = new Logger({
//     logLevel: 'debug',
//     logDir: './logs',
//     logFiles: {
//         all: 'combined.log',
//         error: 'errors-only.log'
//     }
// });

// logger.info('Application started');
// logger.debug('Debugging information');
// logger.warn('Warning: Resource usage high');
// logger.err('Error: Connection failed');

// // Close streams when done (optional)
// process.on('exit', () => logger.close());

module.exports = Logger;