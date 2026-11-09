/**
 * Intelli VAS Direct Carrier Billing Service Integration (Service ID 82)
 * Documentation: Intelli_Service_API_Documentation_Updated.pdf
 */

export interface IntelliActiveSubscription {
  subscription_id?: number | string;
  sub_status?: string;
  sub_active?: boolean;
  telco?: string;
  traffic_source?: string;
  active_product_id?: number | string;
  auto_renewal?: boolean;
  starts_date?: string;
  ends_date?: string;
}

export interface IntelliClientAction {
  action: 'prompt' | 'redirect' | string;
  instruction?: string;
  redirection_url?: string;
  campaign_urls?: Array<{
    antifraud?: string;
    telco?: string;
    type?: string;
    url?: string;
    product_id?: string;
  }>;
}

export interface IntelliSubscriptionResponse {
  success: boolean;
  message?: string;
  data?: {
    service_id: number;
    msisdn: string;
    has_any_subscription: boolean;
    has_active_subscription: boolean;
    active_subscription: IntelliActiveSubscription | null;
    billing_records?: any[];
    client_action?: IntelliClientAction[];
  };
}

/**
 * Normalizes phone numbers to standard international MSISDN format.
 * Strips leading +, 0, spaces, and hyphens.
 * Defaults Nigerian 10/11-digit numbers (e.g. 08012345678 -> 2348012345678).
 */
export function normalizeMsisdn(phone: string, defaultCountryCode = '234'): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = defaultCountryCode + cleaned.substring(1);
  } else if (!cleaned.startsWith(defaultCountryCode) && cleaned.length === 10) {
    cleaned = defaultCountryCode + cleaned;
  }
  return cleaned;
}

/**
 * Checks subscription status with the Intelli Service API.
 */
export async function checkSubscriptionStatus(msisdn: string): Promise<IntelliSubscriptionResponse> {
  const normalizedMsisdn = normalizeMsisdn(msisdn);
  const baseUrl = process.env.INTELLI_BASE_URL || 'https://api.intellihq.net';
  const serviceId = process.env.INTELLI_SERVICE_ID || '82';

  const url = new URL(`${baseUrl}/api/v1/service/${serviceId}/subscription/status/`);
  url.searchParams.set('msisdn', normalizedMsisdn);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const data: IntelliSubscriptionResponse = await response.json();
    return data;
  } catch (err: any) {
    console.error('Intelli API Subscription Status Fetch Failed:', err);
    return {
      success: false,
      message: err.message || 'Failed to connect to subscription provider',
    };
  }
}

