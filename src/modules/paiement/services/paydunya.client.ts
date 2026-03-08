import { createHash } from 'crypto';
import { AppError } from '../../../shared/utils/AppError';

interface PaydunyaCreateInvoiceInput {
  amount: number;
  description: string;
  reference: string;
  customData?: Record<string, unknown>;
  channels?: string[];
  callbackUrl?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

interface PaydunyaCreateInvoiceResponse {
  response_code?: string;
  response_text?: string;
  token?: string;
  description?: string;
}

interface PaydunyaConfirmInvoiceResponse {
  response_code?: string;
  response_text?: string;
  response_message?: string;
  token?: string;
  status?: string;
}

interface PaydunyaHeaders {
  masterKey: string;
  privateKey: string;
  token: string;
  mode: string;
}

const PAYDUNYA_DEFAULT_BASE_URL = 'https://app.paydunya.com';

const toNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export class PaydunyaClient {
  private baseUrl(): string {
    return (toNonEmptyString(process.env.PAYDUNYA_BASE_URL) || PAYDUNYA_DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  isConfigured(): boolean {
    return Boolean(
      toNonEmptyString(process.env.PAYDUNYA_MASTER_KEY) &&
        toNonEmptyString(process.env.PAYDUNYA_PRIVATE_KEY) &&
        toNonEmptyString(process.env.PAYDUNYA_TOKEN)
    );
  }

  private requireHeaders(): PaydunyaHeaders {
    const masterKey = toNonEmptyString(process.env.PAYDUNYA_MASTER_KEY);
    const privateKey = toNonEmptyString(process.env.PAYDUNYA_PRIVATE_KEY);
    const token = toNonEmptyString(process.env.PAYDUNYA_TOKEN);
    const mode = toNonEmptyString(process.env.PAYDUNYA_MODE) || 'test';

    if (!masterKey || !privateKey || !token) {
      throw new AppError(
        'Configuration PayDunya incomplète. Définissez PAYDUNYA_MASTER_KEY, PAYDUNYA_PRIVATE_KEY et PAYDUNYA_TOKEN.',
        503
      );
    }

    return { masterKey, privateKey, token, mode };
  }

  private requestHeaders(contentType: string = 'application/json'): Record<string, string> {
    const cfg = this.requireHeaders();
    return {
      'Content-Type': contentType,
      Accept: 'application/json',
      'PAYDUNYA-MASTER-KEY': cfg.masterKey,
      'PAYDUNYA-PRIVATE-KEY': cfg.privateKey,
      'PAYDUNYA-TOKEN': cfg.token,
      'PAYDUNYA-MODE': cfg.mode,
    };
  }

  private webhookSignatureHash(): string {
    const cfg = this.requireHeaders();
    return createHash('sha512').update(cfg.masterKey).digest('hex');
  }

  assertWebhookSignature(incomingHash?: string): void {
    const received = toNonEmptyString(incomingHash);
    if (!received) {
      throw new AppError('Hash PayDunya manquant dans le callback', 400);
    }

    const expected = this.webhookSignatureHash();
    if (expected !== received) {
      throw new AppError('Signature PayDunya invalide', 401);
    }
  }

  async createCheckoutInvoice(input: PaydunyaCreateInvoiceInput): Promise<PaydunyaCreateInvoiceResponse> {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError('Montant de paiement invalide', 400);
    }

    const payload: Record<string, unknown> = {
      invoice: {
        total_amount: Number(amount.toFixed(2)),
        description: input.description,
        items: [
          {
            name: input.description,
            quantity: 1,
            unit_price: Number(amount.toFixed(2)),
            total_price: Number(amount.toFixed(2)),
          },
        ],
      },
      store: {
        name: toNonEmptyString(process.env.PAYDUNYA_STORE_NAME) || 'Sante SN',
        tagline: toNonEmptyString(process.env.PAYDUNYA_STORE_TAGLINE) || 'Paiement des consultations',
        website_url: toNonEmptyString(process.env.FRONTEND_URL),
      },
      custom_data: {
        reference: input.reference,
        ...(input.customData || {}),
      },
    };

    const actions: Record<string, string> = {};
    if (toNonEmptyString(input.cancelUrl)) actions.cancel_url = input.cancelUrl!.trim();
    if (toNonEmptyString(input.returnUrl)) actions.return_url = input.returnUrl!.trim();
    if (toNonEmptyString(input.callbackUrl)) actions.callback_url = input.callbackUrl!.trim();
    if (Object.keys(actions).length > 0) {
      payload.actions = actions;
    }

    if (Array.isArray(input.channels) && input.channels.length > 0) {
      payload.channels = input.channels;
    }

    const response = await fetch(`${this.baseUrl()}/api/v1/checkout-invoice/create`, {
      method: 'POST',
      headers: this.requestHeaders(),
      body: JSON.stringify(payload),
    });

    let data: PaydunyaCreateInvoiceResponse = {};
    try {
      data = (await response.json()) as PaydunyaCreateInvoiceResponse;
    } catch {
      // Keep default object when provider does not return valid JSON
    }

    if (!response.ok) {
      throw new AppError(
        data?.description || data?.response_text || 'Création de session PayDunya impossible',
        response.status
      );
    }

    return data;
  }

  async confirmCheckoutInvoice(token: string): Promise<PaydunyaConfirmInvoiceResponse> {
    const trimmedToken = toNonEmptyString(token);
    if (!trimmedToken) {
      throw new AppError('Token de paiement PayDunya invalide', 400);
    }

    const response = await fetch(`${this.baseUrl()}/api/v1/checkout-invoice/confirm/${trimmedToken}`, {
      method: 'GET',
      headers: this.requestHeaders(),
    });

    let data: PaydunyaConfirmInvoiceResponse = {};
    try {
      data = (await response.json()) as PaydunyaConfirmInvoiceResponse;
    } catch {
      // Keep default object when provider does not return valid JSON
    }

    if (!response.ok) {
      throw new AppError(
        data?.response_text || data?.response_message || 'Vérification du paiement PayDunya impossible',
        response.status
      );
    }

    return data;
  }
}
