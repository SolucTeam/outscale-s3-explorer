/**
 * Service de logging structuré pour production
 * Niveaux: debug, info, warn, error
 * Contrôlé par la configuration environment
 */

import { env } from '@/config/environment';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: any;
  error?: Error;
}

class LoggingService {
  private static instance: LoggingService;
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  private constructor() {}

  static getInstance(): LoggingService {
    if (!this.instance) {
      this.instance = new LoggingService();
    }
    return this.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!env.loggingEnabled) return false;
    
    const currentLevel = this.logLevels[env.logLevel as LogLevel] ?? 1;
    const messageLevel = this.logLevels[level];
    
    return messageLevel >= currentLevel;
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, service, message, data } = entry;
    let formatted = `[${timestamp}] [${level.toUpperCase()}] [${service}] ${message}`;
    
    if (data) {
      formatted += ` ${JSON.stringify(data)}`;
    }
    
    return formatted;
  }

  private log(level: LogLevel, service: string, message: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      data,
      error
    };

    const formatted = this.formatLog(entry);

    // En production, on peut envoyer vers un service externe
    // Pour l'instant, on utilise console avec le bon niveau
    switch (level) {
      case 'debug':
        console.debug(formatted, error || '');
        break;
      case 'info':
        console.info(formatted, data || '');
        break;
      case 'warn':
        console.warn(formatted, data || '');
        break;
      case 'error':
        console.error(formatted, error || data || '');
        break;
    }
  }

  debug(service: string, message: string, data?: any): void {
    this.log('debug', service, message, data);
  }

  info(service: string, message: string, data?: any): void {
    this.log('info', service, message, data);
  }

  warn(service: string, message: string, data?: any): void {
    this.log('warn', service, message, data);
  }

  error(service: string, message: string, error?: Error | any): void {
    this.log('error', service, message, undefined, error instanceof Error ? error : undefined);
  }

  // Logs groupés pour performance
  group(service: string, groupName: string, logs: Array<{ level: LogLevel; message: string; data?: any }>): void {
    if (!this.shouldLog('debug')) return;
    
    console.group(`[${service}] ${groupName}`);
    logs.forEach(log => this.log(log.level, service, log.message, log.data));
    console.groupEnd();
  }
}

export const logger = LoggingService.getInstance();
