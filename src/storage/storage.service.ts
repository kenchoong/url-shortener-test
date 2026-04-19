import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { ShortUrlRecord, StorageFileShape } from './storage.types';

@Injectable()
export class StorageService implements OnModuleInit, OnApplicationShutdown {
  private static readonly defaultPersistIntervalSeconds = 10;
  private static readonly defaultDataFilePath = 'data/store.json';

  private readonly logger = new Logger(StorageService.name);
  private readonly records = new Map<string, ShortUrlRecord>();
  private readonly urlToKey = new Map<string, string>();
  private flushInterval?: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.loadFromDisk();
    this.startPeriodicFlush();
  }

  async onApplicationShutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    await this.flushToDisk();
  }

  get(key: string) {
    return this.records.get(key);
  }

  getKeyByUrl(url: string) {
    return this.urlToKey.get(url);
  }

  set(key: string, record: ShortUrlRecord) {
    const existingKeyForUrl = this.urlToKey.get(record.url);

    if (existingKeyForUrl && existingKeyForUrl !== key) {
      throw new Error(
        `URL "${record.url}" is already stored under key "${existingKeyForUrl}".`,
      );
    }

    const existingRecord = this.records.get(key);

    if (existingRecord && existingRecord.url !== record.url) {
      this.urlToKey.delete(existingRecord.url);
    }

    this.records.set(key, record);
    this.urlToKey.set(record.url, key);
  }

  has(key: string) {
    return this.records.has(key);
  }

  incrementVisits(key: string) {
    const existing = this.records.get(key);

    if (!existing) {
      return null;
    }

    const updated: ShortUrlRecord = {
      ...existing,
      visits: existing.visits + 1,
    };

    this.records.set(key, updated);
    return updated;
  }

  snapshot(): StorageFileShape {
    return {
      urls: Object.fromEntries(this.records.entries()),
    };
  }

  private async loadFromDisk() {
    const dataFilePath = this.getDataFilePath();
    await mkdir(dirname(dataFilePath), { recursive: true });

    try {
      const raw = await readFile(dataFilePath, 'utf8');
      const parsed = JSON.parse(raw) as StorageFileShape;
      let duplicateUrlCount = 0;

      for (const [key, value] of Object.entries(parsed.urls ?? {})) {
        const existingKey = this.urlToKey.get(value.url);

        if (!existingKey) {
          this.records.set(key, value);
          this.urlToKey.set(value.url, key);
          continue;
        }

        const mergedRecord = this.mergeDuplicateRecords(
          this.records.get(existingKey)!,
          value,
        );

        this.records.set(existingKey, mergedRecord);
        duplicateUrlCount += 1;

        this.logger.warn(
          `Collapsed duplicate persisted URL "${value.url}" from key "${key}" into existing key "${existingKey}".`,
        );
      }

      this.logger.log(`Loaded ${this.records.size} records from ${dataFilePath}`);

      if (duplicateUrlCount > 0) {
        this.logger.warn(
          `Collapsed ${duplicateUrlCount} duplicate URL record(s) while loading ${dataFilePath}.`,
        );
      }
    } catch (error) {
      await writeFile(
        dataFilePath,
        `${JSON.stringify({ urls: {} }, null, 2)}\n`,
        'utf8',
      );
      const reason =
        error instanceof Error ? error.message : 'missing or unreadable file';

      this.logger.warn(
        `Initialized empty storage at ${dataFilePath} (${reason})`,
      );
    }
  }

  async flushToDisk() {
    const dataFilePath = this.getDataFilePath();

    await mkdir(dirname(dataFilePath), { recursive: true });
    await writeFile(
      dataFilePath,
      `${JSON.stringify(this.snapshot(), null, 2)}\n`,
      'utf8',
    );

    this.logger.log(`Persisted ${this.records.size} records to ${dataFilePath}`);
  }

  private getDataFilePath() {
    const configuredPath =
      this.configService.get<string>('DATA_FILE_PATH') ??
      StorageService.defaultDataFilePath;

    return isAbsolute(configuredPath)
      ? configuredPath
      : resolve(process.cwd(), configuredPath);
  }

  private startPeriodicFlush() {
    const intervalMs = this.getPersistIntervalMs();

    this.flushInterval = setInterval(() => {
      void this.flushToDisk().catch((error: Error) => {
        this.logger.error(
          `Failed to persist records during periodic flush: ${error.message}`,
        );
      });
    }, intervalMs);
    this.flushInterval.unref?.();

    this.logger.log(`Periodic persistence enabled every ${intervalMs}ms`);
  }

  private getPersistIntervalMs() {
    const configuredValue = Number(
      this.configService.get<string>('PERSIST_INTERVAL') ??
        StorageService.defaultPersistIntervalSeconds,
    );

    if (!Number.isFinite(configuredValue) || configuredValue <= 0) {
      this.logger.warn(
        `Invalid PERSIST_INTERVAL value "${this.configService.get<string>('PERSIST_INTERVAL')}". Falling back to ${StorageService.defaultPersistIntervalSeconds}s.`,
      );

      return StorageService.defaultPersistIntervalSeconds * 1000;
    }

    return configuredValue * 1000;
  }

  private mergeDuplicateRecords(
    existingRecord: ShortUrlRecord,
    duplicateRecord: ShortUrlRecord,
  ): ShortUrlRecord {
    return {
      url: existingRecord.url,
      createdAt:
        duplicateRecord.createdAt < existingRecord.createdAt
          ? duplicateRecord.createdAt
          : existingRecord.createdAt,
      visits: existingRecord.visits + duplicateRecord.visits,
    };
  }
}
