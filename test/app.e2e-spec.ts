import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { StorageFileShape } from '../src/storage/storage.types';

describe('Courtside scaffold (e2e)', () => {
  const preloadedUrl = 'https://example.com/preloaded';
  const preloadedKey = 'a1b2c3';
  const duplicatePreloadedKey = 'd4e5f6';
  let app: INestApplication;
  let sandboxDir: string;
  let dataFilePath: string;
  let appClosed = false;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  const originalDataFilePath = process.env.DATA_FILE_PATH;
  const originalPersistInterval = process.env.PERSIST_INTERVAL;

  async function readStore() {
    return JSON.parse(
      await readFile(dataFilePath, 'utf8'),
    ) as StorageFileShape;
  }

  async function waitFor(condition: () => Promise<boolean>, timeoutMs = 3000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      try {
        if (await condition()) {
          return;
        }
      } catch {
        // Wait for the first periodic write to create the file.
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Condition was not met within ${timeoutMs}ms.`);
  }

  beforeAll(async () => {
    sandboxDir = await mkdtemp(join(tmpdir(), 'courtside-'));
    dataFilePath = join(sandboxDir, 'store.json');
    await writeFile(
      dataFilePath,
      `${JSON.stringify(
        {
          urls: {
            [preloadedKey]: {
              url: preloadedUrl,
              createdAt: '2026-04-19T07:00:00.000Z',
              visits: 1,
            },
            [duplicatePreloadedKey]: {
              url: preloadedUrl,
              createdAt: '2026-04-19T08:00:00.000Z',
              visits: 2,
            },
          },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    process.env.DATA_FILE_PATH = dataFilePath;
    process.env.PERSIST_INTERVAL = '1';
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new LoggingInterceptor());

    await app.init();
  });

  afterAll(async () => {
    if (!appClosed) {
      await app.close();
    }

    logSpy.mockRestore();
    errorSpy.mockRestore();
    if (originalDataFilePath === undefined) {
      delete process.env.DATA_FILE_PATH;
    } else {
      process.env.DATA_FILE_PATH = originalDataFilePath;
    }

    if (originalPersistInterval === undefined) {
      delete process.env.PERSIST_INTERVAL;
    } else {
      process.env.PERSIST_INTERVAL = originalPersistInterval;
    }
    await rm(sandboxDir, { recursive: true, force: true });
  });

  it('creates a short url key', async () => {
    const response = await request(app.getHttpServer())
      .post('/shorten_url')
      .send({ url: 'https://example.com' })
      .expect(201);

    expect(response.body.key).toMatch(/^[a-f0-9]{6}$/);
    expect(response.body.short_url).toMatch(
      new RegExp(`^http://127\\.0\\.0\\.1:\\d+/shorten_url/${response.body.key}$`),
    );
  });

  it('returns an existing key when the URL was already created', async () => {
    const firstResponse = await request(app.getHttpServer())
      .post('/shorten_url')
      .send({ url: 'https://example.com/query-or-insert' })
      .expect(201);

    const secondResponse = await request(app.getHttpServer())
      .post('/shorten_url')
      .send({ url: 'https://example.com/query-or-insert' })
      .expect(200);

    expect(secondResponse.body.key).toBe(firstResponse.body.key);
    expect(secondResponse.body.short_url).toMatch(
      new RegExp(`^http://127\\.0\\.0\\.1:\\d+/shorten_url/${firstResponse.body.key}$`),
    );
  });

  it('rejects an invalid URL with a 400 response', async () => {
    const response = await request(app.getHttpServer())
      .post('/shorten_url')
      .send({ url: 'not-a-valid-url' })
      .expect(400);

    expect(response.body.message).toContain('url must be a URL address');
  });

  it('redirects using a stored key', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/shorten_url')
      .send({ url: 'https://example.com/path' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/shorten_url/${createResponse.body.key}`)
      .expect(302)
      .expect('Location', 'https://example.com/path');
  });

  it('reuses the existing persisted key for a preloaded URL', async () => {
    const response = await request(app.getHttpServer())
      .post('/shorten_url')
      .send({ url: preloadedUrl })
      .expect(200);

    expect(response.body.key).toBe(preloadedKey);
  });

  it('returns 404 when the short key does not exist', async () => {
    const response = await request(app.getHttpServer())
      .get('/shorten_url/missing1')
      .expect(404);

    expect(response.body.message).toBe('Short URL key "missing1" was not found.');
  });

  it('uses forwarded headers when building the short url response', async () => {
    const response = await request(app.getHttpServer())
      .post('/shorten_url')
      .set('x-forwarded-proto', 'https')
      .set('x-forwarded-host', 'sho.rt')
      .send({ url: 'https://example.com/forwarded' })
      .expect(201);

    expect(response.body.short_url).toBe(
      `https://sho.rt/shorten_url/${response.body.key}`,
    );
  });

  it('logs successful request responses through the interceptor', async () => {
    const response = await request(app.getHttpServer())
      .post('/shorten_url')
      .send({ url: 'https://example.com/logged' })
      .expect(201);

    expect(
      logSpy.mock.calls.some(([message]) => {
        return (
          typeof message === 'string' &&
          message.includes('"method":"POST"') &&
          message.includes('"path":"/shorten_url"') &&
          message.includes('"statusCode":201')
        );
      }),
    ).toBe(true);
  });

  it('logs failed request responses through the interceptor', async () => {
    await request(app.getHttpServer()).get('/shorten_url/unknown2').expect(404);

    expect(
      errorSpy.mock.calls.some(([message]) => {
        return (
          typeof message === 'string' &&
          message.includes('"method":"GET"') &&
          message.includes('"path":"/shorten_url/unknown2"') &&
          message.includes('"statusCode":404') &&
          message.includes('Short URL key \\"unknown2\\" was not found.')
        );
      }),
    ).toBe(true);
  });

  it('flushes records to disk on the periodic interval', async () => {
    const response = await request(app.getHttpServer())
      .post('/shorten_url')
      .send({ url: 'https://example.com/periodic-flush' })
      .expect(201);

    await waitFor(async () => {
      const store = await readStore();
      return store.urls[response.body.key]?.url === 'https://example.com/periodic-flush';
    });
  });

  it('collapses duplicate URLs from the persisted store into one key', async () => {
    await waitFor(async () => {
      const store = await readStore();

      return (
        store.urls[preloadedKey]?.url === preloadedUrl &&
        store.urls[preloadedKey]?.visits === 3 &&
        store.urls[duplicatePreloadedKey] === undefined
      );
    });

    const store = await readStore();

    expect(store.urls[preloadedKey]).toEqual({
      url: preloadedUrl,
      createdAt: '2026-04-19T07:00:00.000Z',
      visits: 3,
    });
    expect(store.urls[duplicatePreloadedKey]).toBeUndefined();
  });

  it('flushes records to disk again during graceful shutdown', async () => {
    const response = await request(app.getHttpServer())
      .post('/shorten_url')
      .send({ url: 'https://example.com/shutdown-flush' })
      .expect(201);

    await app.close();
    appClosed = true;

    const store = await readStore();

    expect(store.urls[response.body.key]?.url).toBe(
      'https://example.com/shutdown-flush',
    );
  });
});
