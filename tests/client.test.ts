import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FlySend, FlySendError, ValidationError, QuotaExceededError } from '../src';

describe('FlySend', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('throws if no API key is provided', () => {
    expect(() => new FlySend('')).toThrow('FlySend API key is required.');
  });

  it('accepts a string API key', () => {
    const client = new FlySend('test-key');
    expect(client).toBeInstanceOf(FlySend);
  });

  it('accepts a config object', () => {
    const client = new FlySend({
      apiKey: 'test-key',
      baseUrl: 'https://custom.api.com',
      timeout: 5000,
    });
    expect(client).toBeInstanceOf(FlySend);
  });

  it('exposes emails namespace', () => {
    const client = new FlySend('test-key');
    expect(client.emails).toBeDefined();
    expect(typeof client.emails.send).toBe('function');
    expect(typeof client.emails.batch).toBe('function');
  });
});

describe('emails.send', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends a single email', async () => {
    const mockResponse = {
      success: true,
      message: 'Email queued successfully',
      data: { id: 'email-123', status: 'pending', queued_at: '2025-01-01T00:00:00Z' },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve(mockResponse),
    });

    const client = new FlySend('test-key');
    const result = await client.emails.send({
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Hello',
      html: '<p>World</p>',
    });

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.flysend.co/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('sends correct payload', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: () =>
        Promise.resolve({
          success: true,
          data: { id: '1', status: 'pending', queued_at: '' },
        }),
    });

    const client = new FlySend('test-key');
    await client.emails.send({
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      text: 'Hello',
      cc: 'cc@example.com',
      bcc: 'bcc@example.com',
      reply_to: 'reply@example.com',
      tags: [{ name: 'campaign', value: 'welcome' }],
      attachments: [
        { filename: 'doc.pdf', content: 'base64content', mime_type: 'application/pdf' },
      ],
    });

    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.from).toBe('sender@example.com');
    expect(body.to).toBe('recipient@example.com');
    expect(body.subject).toBe('Test');
    expect(body.html).toBe('<p>Hello</p>');
    expect(body.text).toBe('Hello');
    expect(body.cc).toBe('cc@example.com');
    expect(body.bcc).toBe('bcc@example.com');
    expect(body.reply_to).toBe('reply@example.com');
    expect(body.tags).toEqual([{ name: 'campaign', value: 'welcome' }]);
    expect(body.attachments).toHaveLength(1);
  });

  it('uses custom base URL', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: () =>
        Promise.resolve({ success: true, data: { id: '1', status: 'pending', queued_at: '' } }),
    });

    const client = new FlySend({ apiKey: 'key', baseUrl: 'https://custom.api.com' });
    await client.emails.send({
      from: 'a@b.com',
      to: 'c@d.com',
      subject: 'Test',
      text: 'hi',
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://custom.api.com/emails',
      expect.anything(),
    );
  });

  it('throws FlySendError on API error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({ error: 'invalid_domain', message: 'Domain not found or not verified' }),
    });

    const client = new FlySend('test-key');

    await expect(
      client.emails.send({
        from: 'a@bad.com',
        to: 'b@c.com',
        subject: 'Test',
        text: 'hi',
      }),
    ).rejects.toThrow(FlySendError);
  });

  it('throws ValidationError on 422 with errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () =>
        Promise.resolve({
          message: 'The given data was invalid.',
          errors: { to: ['The to field must be a valid email address.'] },
        }),
    });

    const client = new FlySend('test-key');

    try {
      await client.emails.send({
        from: 'a@b.com',
        to: 'not-an-email',
        subject: 'Test',
        text: 'hi',
      });
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).errors).toHaveProperty('to');
    }
  });

  it('throws QuotaExceededError on 429 with quota', async () => {
    const quota = { limit: 1000, used: 1000, remaining: 0, resets_at: '2025-04-30T23:59:59Z' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () =>
        Promise.resolve({
          error: 'quota_exceeded',
          message: 'Monthly email quota exceeded',
          quota,
        }),
    });

    const client = new FlySend('test-key');

    try {
      await client.emails.send({
        from: 'a@b.com',
        to: 'c@d.com',
        subject: 'Test',
        text: 'hi',
      });
      expect.unreachable('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(QuotaExceededError);
      expect((e as QuotaExceededError).quota.remaining).toBe(0);
    }
  });
});

describe('emails.batch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends a batch of emails', async () => {
    const mockResponse = {
      success: true,
      message: 'Batch processing completed',
      total_requested: 2,
      queued_count: 2,
      error_count: 0,
      queued_emails: [
        { index: 0, id: 'email-1', status: 'pending' },
        { index: 1, id: 'email-2', status: 'pending' },
      ],
      errors: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.resolve(mockResponse),
    });

    const client = new FlySend('test-key');
    const result = await client.emails.batch([
      { from: 'a@b.com', to: 'c@d.com', subject: 'Test 1', text: 'hi' },
      { from: 'a@b.com', to: 'e@f.com', subject: 'Test 2', text: 'hello' },
    ]);

    expect(result.queued_count).toBe(2);
    expect(result.queued_emails).toHaveLength(2);

    expect(fetch).toHaveBeenCalledWith(
      'https://api.flysend.co/emails/batch',
      expect.anything(),
    );
  });
});
