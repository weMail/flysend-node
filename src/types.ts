export interface FlySendConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface EmailTag {
  name: string;
  value: string;
}

export interface EmailAttachment {
  filename: string;
  content: string;
  mime_type?: string;
}

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string;
  bcc?: string;
  reply_to?: string;
  headers?: Record<string, string>;
  tags?: EmailTag[];
  attachments?: EmailAttachment[];
}

export interface SendEmailResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    status: string;
    queued_at: string;
  };
}

export interface BatchSendResponse {
  success: boolean;
  message: string;
  total_requested: number;
  queued_count: number;
  error_count: number;
  queued_emails: Array<{
    index: number;
    id: string;
    status: string;
  }>;
  errors: Array<{
    index: number;
    error: string;
  }>;
}

export interface FlySendErrorResponse {
  error?: string;
  message?: string;
  errors?: Record<string, string[]>;
  quota?: {
    limit: number;
    used: number;
    remaining: number;
    resets_at: string;
  };
}
