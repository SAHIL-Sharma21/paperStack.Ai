export const DOCUMENT_CONSUMER_OPTIONS = Symbol('DOCUMENT_CONSUMER_OPTIONS');

export interface DocumentConsumerOptions {
  enabled: boolean;
  /**
   * Embedded = running inside the API process. Startup failures are then
   * retried in the background instead of crashing the API.
   */
  embedded: boolean;
}
