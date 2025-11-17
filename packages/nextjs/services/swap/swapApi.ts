const SWAP_API_URL = process.env.NEXT_PUBLIC_SWAP_API_URL || "http://localhost:3001";

export interface SwapRequest {
  txHash: string;
  amount: string;
  midnightAddress: string;
  direction: "strk-to-tdust" | "tdust-to-strk";
  senderAddress?: string;
}

export interface SwapResponse {
  success: boolean;
  message?: string;
  strkTxHash?: string;
  midnightTxId?: string;
  amount?: string;
  midnightAddress?: string;
  error?: string;
}

export interface BalanceResponse {
  success: boolean;
  address?: string;
  balance?: string;
  formattedBalance?: string;
  error?: string;
}

export interface PaymentRequest {
  amount: string;
  recipientAddress: string; // Midnight address
  paymentMethod: "strk" | "tdust";
  txHash?: string; // Required for STRK payments
  seed?: string; // Required for tDUST payments (wallet seed)
}

export interface PaymentResponse {
  success: boolean;
  message?: string;
  strkTxHash?: string;
  midnightTxId?: string;
  amount?: string;
  recipientAddress?: string;
  error?: string;
}

/**
 * Initiate a swap transaction
 * @param request - Swap request parameters
 * @returns Swap response with transaction details
 */
export async function initiateSwap(request: SwapRequest): Promise<SwapResponse> {
  try {
    const response = await fetch(`${SWAP_API_URL}/api/swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP error! status: ${response.status}`,
      };
    }

    return data as SwapResponse;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to initiate swap",
    };
  }
}

/**
 * Check balance for a Midnight wallet
 * @param seed - Wallet seed (64-character hex string)
 * @returns Balance response with address, balance, and formatted balance
 */
export async function checkBalance(seed: string): Promise<BalanceResponse> {
  try {
    const response = await fetch(`${SWAP_API_URL}/api/check-balance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ seed }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP error! status: ${response.status}`,
      };
    }

    return data as BalanceResponse;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check balance",
    };
  }
}

/**
 * Process a payment (STRK or tDUST)
 * @param request - Payment request parameters
 * @returns Payment response with transaction details
 */
export async function processPayment(request: PaymentRequest): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${SWAP_API_URL}/api/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP error! status: ${response.status}`,
      };
    }

    return data as PaymentResponse;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process payment",
    };
  }
}

