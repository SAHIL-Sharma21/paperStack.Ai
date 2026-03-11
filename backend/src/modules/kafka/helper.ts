import { BROKER_PATTERN } from './constant';

export function parseBrokers(raw: string): string[] {
  const entries = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (entries.length === 0) {
    throw new Error(
      '[KafkaService] Invalid KAFKA_BROKERS: no valid entries. Expected host:port (e.g. localhost:9092)',
    );
  }
  const invalid = entries.filter((b) => !BROKER_PATTERN.test(b));
  if (invalid.length > 0) {
    throw new Error(
      `[KafkaService] Invalid KAFKA_BROKERS: malformed entries "${invalid.join('", "')}". Expected host:port (e.g. localhost:9092)`,
    );
  }
  return entries;
}
