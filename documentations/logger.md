# Logger Module

A flexible and configurable logging utility for Node.js applications with file and console output.

## Features

- Multiple log levels (error, warn, info, debug)
- Colored console output for better visibility
- Separate log files for different log levels
- Configurable log directory and file names
- Automatic log directory creation
- Graceful stream handling
- Timestamped log entries

## Installation

No additional dependencies required beyond Node.js core modules.

## Basic Usage

```javascript
const Logger = require('./logger');

// Create logger with default settings
const logger = new Logger();

// Log messages at different levels
logger.info('Application started');
logger.debug('Debug information');
logger.warn('Warning message');
logger.err('Error occurred');

// Close streams when done (optional)
process.on('exit', () => logger.close());
```

## Configuration Options

You can customize the logger with these options:

```javascript
const logger = new Logger({
    logLevel: 'debug',  // Minimum log level to output (error|warn|info|debug)
    logDir: './logs',   // Directory to store log files
    logFiles: {         // Custom log file names
        all: 'app.log',    // All logs
        error: 'errors.log',    // Error logs only
        debug: 'debug.log'      // Debug logs only
    }
});
```

## Log Levels

1. **error** (highest priority)
2. **warn**
3. **info**
4. **debug** (lowest priority)

The configured `logLevel` determines the minimum level that will be logged. For example, setting `logLevel: 'warn'` will log only warn and error messages.

## Output Format

Each log entry follows this format:
```
[ISO_TIMESTAMP] [LEVEL] message
```

Example:
```
[2023-05-15T14:23:45.678Z] [INFO] Application started
```

## File Output

The logger writes to three files by default:

1. **app.log** - All log messages
2. **errors.log** - Only error messages
3. **debug.log** - Only debug messages

Files are created in the specified log directory and appended to on each run.

## Console Output

Console output includes color coding:
- **Errors**: Red
- **Warnings**: Yellow
- **Info**: Green
- **Debug**: Cyan

## Best Practices

1. Use appropriate log levels:
   - `error` for critical issues
   - `warn` for potential problems
   - `info` for general operational messages
   - `debug` for troubleshooting details

2. For long-running applications, consider:
   - Implementing log rotation
   - Periodically calling `logger.close()` and recreating the logger
   - Setting up process hooks to ensure logs are flushed on exit

3. In production:
   - Set `logLevel` to 'info' or 'warn'
   - Monitor log file sizes
   - Consider using a dedicated logging service for distributed systems

## Example Use Cases

```javascript
// Database operations
try {
    logger.debug('Attempting database connection');
    await connectToDB();
    logger.info('Database connection established');
} catch (err) {
    logger.err(`Database connection failed: ${err.message}`);
}

// API requests
app.get('/data', (req, res) => {
    logger.info(`Request received from ${req.ip}`);
    // ...
});

// Startup configuration
logger.info(`Starting in ${process.env.NODE_ENV} mode`);
logger.debug(`Config values: ${JSON.stringify(config)}`);
```

## License

MIT License