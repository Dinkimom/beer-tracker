import { afterEach, describe, expect, it } from 'vitest';

import {
  getS3Config,
  parseS3ForcePathStyle,
  parseS3KeyPrefix,
  resetS3ConfigCacheForTests,
} from './env';

const S3_ENV_KEYS = [
  'S3_ACCESS_KEY',
  'S3_BUCKET',
  'S3_ENDPOINT_URL',
  'S3_FORCE_PATH_STYLE',
  'S3_KEY_PREFIX',
  'S3_REGION',
  'S3_SECRET_KEY',
] as const;

describe('parseS3KeyPrefix', () => {
  it('normalizes slashes and empty values', () => {
    expect(parseS3KeyPrefix(undefined)).toBe('');
    expect(parseS3KeyPrefix('')).toBe('');
    expect(parseS3KeyPrefix('  /  ')).toBe('');
    expect(parseS3KeyPrefix('local')).toBe('local/');
    expect(parseS3KeyPrefix('/local/')).toBe('local/');
  });
});

describe('parseS3ForcePathStyle', () => {
  it('defaults to true and treats falsey strings as false', () => {
    expect(parseS3ForcePathStyle(undefined)).toBe(true);
    expect(parseS3ForcePathStyle('true')).toBe(true);
    expect(parseS3ForcePathStyle('false')).toBe(false);
    expect(parseS3ForcePathStyle('0')).toBe(false);
  });
});

describe('getS3Config', () => {
  const previous: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of S3_ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    resetS3ConfigCacheForTests();
  });

  function snapshotEnv(): void {
    for (const key of S3_ENV_KEYS) {
      previous[key] = process.env[key];
    }
    resetS3ConfigCacheForTests();
  }

  it('reads required fields and prefix', () => {
    snapshotEnv();
    process.env.S3_ENDPOINT_URL = 'https://s3.example.com';
    process.env.S3_BUCKET = 'beer-tracker-storage';
    process.env.S3_ACCESS_KEY = 'ak';
    process.env.S3_SECRET_KEY = 'sk';
    process.env.S3_KEY_PREFIX = 'local';
    process.env.S3_REGION = 'us-east-1';
    process.env.S3_FORCE_PATH_STYLE = 'true';

    expect(getS3Config()).toEqual({
      accessKey: 'ak',
      bucket: 'beer-tracker-storage',
      endpointUrl: 'https://s3.example.com',
      forcePathStyle: true,
      keyPrefix: 'local/',
      region: 'us-east-1',
      secretKey: 'sk',
    });
  });

  it('throws when the endpoint is missing', () => {
    snapshotEnv();
    delete process.env.S3_ENDPOINT_URL;
    process.env.S3_BUCKET = 'b';
    process.env.S3_ACCESS_KEY = 'a';
    process.env.S3_SECRET_KEY = 's';
    expect(() => getS3Config()).toThrow(/S3_ENDPOINT_URL/);
  });
});
