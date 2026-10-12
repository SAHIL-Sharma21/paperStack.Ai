/**
 * Kafka client configuration shared by the producer and the consumer.
 * Supports plain local brokers and managed clusters (SSL client certs and/or SASL).
 * @author: Sahil Sharma
 */

import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import type { KafkaConfig, SASLOptions } from 'kafkajs';
import { parseBrokers } from './helper';

const SASL_MECHANISMS = ['plain', 'scram-sha-256', 'scram-sha-512'] as const;
type SaslMechanism = (typeof SASL_MECHANISMS)[number];

const CONNECTION_TIMEOUT_MS = 10_000;

export type DocumentProcessingMode = 'kafka' | 'inline';

/** "kafka" (default): publish to Kafka for the consumer. "inline": the API processes uploads itself. */
export function getProcessingMode(
  config: ConfigService,
): DocumentProcessingMode {
  return config.get<string>('DOCUMENT_PROCESSING_MODE') === 'inline'
    ? 'inline'
    : 'kafka';
}

/** When Kafka is unreachable, process the upload inside the API instead of failing it. */
export function isInlineFallbackEnabled(config: ConfigService): boolean {
  return config.get<string>('KAFKA_FALLBACK_INLINE', 'true') !== 'false';
}

/**
 * Accepts PEM text, PEM with literal "\n" escapes (single-line env vars),
 * or a path to a PEM file (e.g. a secret file mounted by the host).
 */
export function readPem(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (value.includes('-----BEGIN')) return value.replace(/\\n/g, '\n');
  if (fs.existsSync(value)) return fs.readFileSync(value, 'utf8');
  throw new Error(
    '[Kafka] SSL setting is neither PEM content nor a path to an existing file',
  );
}

function buildSasl(config: ConfigService): SASLOptions | undefined {
  const mechanism = config
    .get<string>('KAFKA_SASL_MECHANISM')
    ?.trim()
    .toLowerCase();
  if (!mechanism) return undefined;
  if (!SASL_MECHANISMS.includes(mechanism as SaslMechanism)) {
    throw new Error(
      `[Kafka] Invalid KAFKA_SASL_MECHANISM "${mechanism}". Expected one of: ${SASL_MECHANISMS.join(', ')}`,
    );
  }
  return {
    mechanism: mechanism as SaslMechanism,
    username: config.getOrThrow<string>('KAFKA_SASL_USERNAME'),
    password: config.getOrThrow<string>('KAFKA_SASL_PASSWORD'),
  } as SASLOptions;
}

export function buildKafkaConfig(
  config: ConfigService,
  clientIdSuffix = '',
): KafkaConfig {
  const brokers = parseBrokers(
    config.get<string>('KAFKA_BROKERS', 'localhost:9092'),
  );
  const clientId = `${config.get<string>('KAFKA_CLIENT_ID', 'paperstack-backend')}${clientIdSuffix}`;

  const kafkaConfig: KafkaConfig = {
    clientId,
    brokers,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
  };

  const ca = readPem(config.get<string>('KAFKA_SSL_CA'));
  const cert = readPem(config.get<string>('KAFKA_SSL_CERT'));
  const key = readPem(config.get<string>('KAFKA_SSL_KEY'));
  const hasCertificates = Boolean(ca || cert || key);

  if (hasCertificates) {
    kafkaConfig.ssl = {
      rejectUnauthorized: true,
      ...(ca ? { ca: [ca] } : {}),
      ...(cert ? { cert } : {}),
      ...(key ? { key } : {}),
    };
  } else if (config.get<string>('KAFKA_SSL') === 'true') {
    kafkaConfig.ssl = true;
  }

  const sasl = buildSasl(config);
  if (sasl) {
    kafkaConfig.sasl = sasl;
  }

  return kafkaConfig;
}
