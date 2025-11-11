/**
 * 日志工具
 * 将日志输出到 stderr，避免污染 MCP 的 stdout JSON 通信
 */

import { writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

class Logger {
  private logFilePath?: string;

  constructor() {
    this.initLogFile();
  }

  private initLogFile() {
    try {
      const homeDir = homedir();
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const logDir = join(homeDir, '.luma-mcp');
      
      mkdirSync(logDir, { recursive: true });
      this.logFilePath = join(logDir, `luma-mcp-${dateStr}.log`);
    } catch (error) {
      // 如果无法创建日志文件，只输出到 stderr
      process.stderr.write(`[WARN] Failed to initialize log file: ${error}\n`);
    }
  }

  private write(level: string, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const argsStr = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}${argsStr}`;

    // 输出到 stderr
    process.stderr.write(logMessage + '\n');

    // 写入日志文件
    if (this.logFilePath) {
      try {
        appendFileSync(this.logFilePath, logMessage + '\n');
      } catch {
        // 忽略文件写入错误
      }
    }
  }

  info(message: string, ...args: any[]) {
    this.write('info', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.write('error', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.write('warn', message, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.write('debug', message, ...args);
  }
}

export const logger = new Logger();

/**
 * 重定向 console 到 logger，避免污染 stdout
 */
export function setupConsoleRedirection() {
  console.log = logger.info.bind(logger);
  console.info = logger.info.bind(logger);
  console.error = logger.error.bind(logger);
  console.warn = logger.warn.bind(logger);
  console.debug = logger.debug.bind(logger);
}
