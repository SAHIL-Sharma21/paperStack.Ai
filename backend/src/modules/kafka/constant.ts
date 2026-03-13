export const MAX_RETRIES = 5;
export const RETRY_DELAY_MS = 2000;
/** Captures host and port; port must be validated to be 1-65535 */
export const BROKER_PATTERN = /^([^:\s]+):(\d{1,5})$/;

export const MIN_PORT = 1;
export const MAX_PORT = 65535;
