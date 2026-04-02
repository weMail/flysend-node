# FlySend Node.js SDK

The official Node.js SDK for [FlySend](https://flysend.io) — send transactional emails through the FlySend API.

## Requirements

- Node.js 18+

## Installation

```bash
npm install flysend
```

## Quick Start

```typescript
import { FlySend } from 'flysend';

const flysend = new FlySend('your-api-key');

await flysend.emails.send({
  from: 'hello@example.com',
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<p>Hello world!</p>',
});
```

## Configuration

```typescript
const flysend = new FlySend({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.flysend.co', // optional, for self-hosted instances
  timeout: 30000,                     // optional, default 30s
});
```

## Send Email

```typescript
const response = await flysend.emails.send({
  from: 'Company <hello@example.com>',
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<p>Hello!</p>',
  text: 'Hello!',                              // optional
  cc: 'cc@example.com',                        // optional
  bcc: 'bcc@example.com',                      // optional
  reply_to: 'support@example.com',             // optional
  tags: [                                      // optional
    { name: 'campaign', value: 'welcome' },
  ],
  attachments: [                               // optional
    {
      filename: 'invoice.pdf',
      content: base64EncodedContent,
      mime_type: 'application/pdf',
    },
  ],
});

console.log(response.data.id); // email ID
```

## Batch Send

Send up to 100 emails in a single request:

```typescript
const response = await flysend.emails.batch([
  {
    from: 'hello@example.com',
    to: 'user1@example.com',
    subject: 'Hello User 1',
    html: '<p>Hi!</p>',
  },
  {
    from: 'hello@example.com',
    to: 'user2@example.com',
    subject: 'Hello User 2',
    html: '<p>Hi!</p>',
  },
]);

console.log(response.queued_count);  // number of emails queued
console.log(response.error_count);   // number of failures
```

## Error Handling

```typescript
import { FlySend, FlySendError, ValidationError, QuotaExceededError } from 'flysend';

try {
  await flysend.emails.send({ ... });
} catch (error) {
  if (error instanceof QuotaExceededError) {
    console.log('Quota exceeded:', error.quota.remaining);
  } else if (error instanceof ValidationError) {
    console.log('Validation errors:', error.errors);
  } else if (error instanceof FlySendError) {
    console.log('API error:', error.message, error.statusCode);
  }
}
```

## License

MIT
