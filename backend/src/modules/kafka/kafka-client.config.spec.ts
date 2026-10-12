import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildKafkaConfig,
  getProcessingMode,
  isInlineFallbackEnabled,
  readPem,
} from './kafka-client.config';

const PEM = '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----';

function configWith(values: Record<string, string>): ConfigService {
  return new ConfigService(values);
}

describe('readPem', () => {
  it('returns undefined for empty values', () => {
    expect(readPem(undefined)).toBeUndefined();
    expect(readPem('  ')).toBeUndefined();
  });

  it('accepts multi-line and \\n-escaped PEM content', () => {
    expect(readPem(PEM)).toBe(PEM);
    expect(readPem(PEM.replace(/\n/g, '\\n'))).toBe(PEM);
  });

  it('reads PEM from a file path', () => {
    const file = path.join(os.tmpdir(), `kafka-ca-${Date.now()}.pem`);
    fs.writeFileSync(file, PEM);
    try {
      expect(readPem(file)).toBe(PEM);
    } finally {
      fs.unlinkSync(file);
    }
  });

  it('rejects values that are neither PEM nor an existing file', () => {
    expect(() => readPem('not-a-cert')).toThrow(/neither PEM content/);
  });
});

describe('buildKafkaConfig', () => {
  it('builds a plain config for local brokers', () => {
    const cfg = buildKafkaConfig(
      configWith({ KAFKA_BROKERS: 'kafka:29092', KAFKA_CLIENT_ID: 'app' }),
      '-consumer',
    );
    expect(cfg.brokers).toEqual(['kafka:29092']);
    expect(cfg.clientId).toBe('app-consumer');
    expect(cfg.ssl).toBeUndefined();
    expect(cfg.sasl).toBeUndefined();
  });

  it('uses client certificates when provided', () => {
    const cfg = buildKafkaConfig(
      configWith({
        KAFKA_BROKERS: 'host.aivencloud.com:12345',
        KAFKA_SSL_CA: PEM,
        KAFKA_SSL_CERT: PEM,
        KAFKA_SSL_KEY: PEM,
      }),
    );
    expect(cfg.ssl).toEqual({
      rejectUnauthorized: true,
      ca: [PEM],
      cert: PEM,
      key: PEM,
    });
  });

  it('enables plain TLS with KAFKA_SSL=true', () => {
    const cfg = buildKafkaConfig(
      configWith({ KAFKA_BROKERS: 'host:9093', KAFKA_SSL: 'true' }),
    );
    expect(cfg.ssl).toBe(true);
  });

  it('configures SASL and validates the mechanism', () => {
    const cfg = buildKafkaConfig(
      configWith({
        KAFKA_BROKERS: 'host:9093',
        KAFKA_SASL_MECHANISM: 'SCRAM-SHA-256',
        KAFKA_SASL_USERNAME: 'user',
        KAFKA_SASL_PASSWORD: 'pass',
      }),
    );
    expect(cfg.sasl).toEqual({
      mechanism: 'scram-sha-256',
      username: 'user',
      password: 'pass',
    });

    expect(() =>
      buildKafkaConfig(
        configWith({ KAFKA_BROKERS: 'host:9093', KAFKA_SASL_MECHANISM: 'md5' }),
      ),
    ).toThrow(/Invalid KAFKA_SASL_MECHANISM/);
  });
});

describe('processing mode flags', () => {
  it('defaults to kafka with inline fallback on', () => {
    const config = configWith({});
    expect(getProcessingMode(config)).toBe('kafka');
    expect(isInlineFallbackEnabled(config)).toBe(true);
  });

  it('reads inline mode and disabled fallback', () => {
    const config = configWith({
      DOCUMENT_PROCESSING_MODE: 'inline',
      KAFKA_FALLBACK_INLINE: 'false',
    });
    expect(getProcessingMode(config)).toBe('inline');
    expect(isInlineFallbackEnabled(config)).toBe(false);
  });
});
