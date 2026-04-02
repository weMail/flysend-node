import { FlySendError } from './errors';
import type {
  BatchSendResponse,
  FlySendConfig,
  FlySendErrorResponse,
  SendEmailParams,
  SendEmailResponse,
} from './types';

const DEFAULT_BASE_URL = 'https://api.flysend.co';
const DEFAULT_TIMEOUT = 30_000;

export class FlySend {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  public readonly emails: Emails;

  constructor(apiKey: string);
  constructor(config: FlySendConfig);
  constructor(configOrKey: string | FlySendConfig) {
    if (typeof configOrKey === 'string') {
      this.apiKey = configOrKey;
      this.baseUrl = DEFAULT_BASE_URL;
      this.timeout = DEFAULT_TIMEOUT;
    } else {
      this.apiKey = configOrKey.apiKey;
      this.baseUrl = configOrKey.baseUrl ?? DEFAULT_BASE_URL;
      this.timeout = configOrKey.timeout ?? DEFAULT_TIMEOUT;
    }

    if (!this.apiKey) {
      throw new Error('FlySend API key is required.');
    }

    this.emails = new Emails(this);
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw FlySendError.fromResponse(
          response.status,
          data as FlySendErrorResponse,
        );
      }

      return data as T;
    } catch (error) {
      if (error instanceof FlySendError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new FlySendError('Request timed out', 0, 'timeout');
      }

      throw new FlySendError(
        error instanceof Error ? error.message : 'Request failed',
        0,
        'network_error',
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

class Emails {
  constructor(private readonly client: FlySend) {}

  async send(params: SendEmailParams): Promise<SendEmailResponse> {
    return this.client.request<SendEmailResponse>('POST', '/emails', params);
  }

  async batch(params: SendEmailParams[]): Promise<BatchSendResponse> {
    return this.client.request<BatchSendResponse>(
      'POST',
      '/emails/batch',
      params,
    );
  }
}
