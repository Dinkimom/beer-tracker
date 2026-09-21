import type { PlannerObjectStore, PlannerStoredObject } from './plannerObjectStore';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import { getS3Config, type S3Config } from '@/lib/env';

export class S3PlannerObjectStore implements PlannerObjectStore {
  private readonly bucket: string;

  private readonly client: S3Client;

  constructor(config: S3Config = getS3Config(), client?: S3Client) {
    this.bucket = config.bucket;
    this.client =
      client ??
      new S3Client({
        credentials: {
          accessKeyId: config.accessKey,
          secretAccessKey: config.secretKey,
        },
        endpoint: config.endpointUrl,
        forcePathStyle: config.forcePathStyle,
        region: config.region,
      });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  async getObject(key: string): Promise<PlannerStoredObject | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      if (!result.Body) {
        return null;
      }
      const bytes = await result.Body.transformToByteArray();
      return {
        body: Buffer.from(bytes),
        contentType: result.ContentType || 'application/octet-stream',
      };
    } catch (error) {
      if (isS3NotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Body: body,
        Bucket: this.bucket,
        ContentType: contentType,
        Key: key,
      })
    );
  }
}

function isS3NotFound(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const name = 'name' in error ? error.name : undefined;
  return name === 'NoSuchKey' || name === 'NotFound' || getHttpStatus(error) === 404;
}

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('$metadata' in error)) {
    return undefined;
  }
  const metadata = error.$metadata;
  if (typeof metadata !== 'object' || metadata === null || !('httpStatusCode' in metadata)) {
    return undefined;
  }
  const status = metadata.httpStatusCode;
  return typeof status === 'number' ? status : undefined;
}
