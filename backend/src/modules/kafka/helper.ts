import { BROKER_PATTERN, MAX_PORT, MIN_PORT } from './constant';

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
  const invalid: string[] = [];
  for (const entry of entries) {
    const match = entry.match(BROKER_PATTERN);
    if (!match) {
      invalid.push(entry);
      continue;
    }
    const port = Number.parseInt(match[2], 10);
    if (port < MIN_PORT || port > MAX_PORT) {
      invalid.push(entry);
    }
  }
  if (invalid.length > 0) {
    throw new Error(
      `[KafkaService] Invalid KAFKA_BROKERS: malformed entries "${invalid.join('", "')}". Expected host:port with port 1-65535 (e.g. localhost:9092)`,
    );
  }
  return entries;
}
