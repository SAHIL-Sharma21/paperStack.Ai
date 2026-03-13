import { parseBrokers } from './helper';

describe('parseBrokers', () => {
  it('accepts valid brokers', () => {
    expect(parseBrokers('localhost:9092')).toEqual(['localhost:9092']);
    expect(parseBrokers('kafka:9092,broker2:9093')).toEqual([
      'kafka:9092',
      'broker2:9093',
    ]);
    expect(parseBrokers('host:65535')).toEqual(['host:65535']);
    expect(parseBrokers('host:1')).toEqual(['host:1']);
  });

  it('rejects port out of range', () => {
    expect(() => parseBrokers('localhost:70000')).toThrow(
      /Invalid KAFKA_BROKERS.*port 1-65535/,
    );
    expect(() => parseBrokers('localhost:0')).toThrow(
      /Invalid KAFKA_BROKERS.*port 1-65535/,
    );
    expect(() => parseBrokers('host:65536')).toThrow(
      /Invalid KAFKA_BROKERS.*port 1-65535/,
    );
  });

  it('rejects malformed entries', () => {
    expect(() => parseBrokers('no-port')).toThrow(/Invalid KAFKA_BROKERS/);
    expect(() => parseBrokers('localhost:abc')).toThrow(
      /Invalid KAFKA_BROKERS/,
    );
  });

  it('rejects empty input', () => {
    expect(() => parseBrokers('')).toThrow(/no valid entries/);
    expect(() => parseBrokers('   ,  ')).toThrow(/no valid entries/);
  });
});
