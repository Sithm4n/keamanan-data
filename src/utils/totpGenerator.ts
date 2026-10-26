/**
 * Time-based One-Time Password (TOTP) Generator & Biometric Simulator
 * for AwanPay Corporate Digital Wallet
 */

export const TOTP_PERIOD_SECONDS = 30;

// Deterministic simple hash algorithm to generate rolling 6-digit corporate token
export function generateLiveTotp(secretKey: string = 'AWANPAY_CORP_2026', timeMs: number = Date.now()): {
  code: string;
  remainingSeconds: number;
  period: number;
} {
  const epoch = Math.floor(timeMs / 1000);
  const timeStep = Math.floor(epoch / TOTP_PERIOD_SECONDS);
  const remainingSeconds = TOTP_PERIOD_SECONDS - (epoch % TOTP_PERIOD_SECONDS);

  // Simple deterministic integer hash
  let hash = 0;
  const input = `${secretKey}:${timeStep}`;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }

  // Convert to absolute positive 6 digits
  const positive = Math.abs(hash);
  const code = String(positive % 1000000).padStart(6, '0');

  return {
    code,
    remainingSeconds,
    period: TOTP_PERIOD_SECONDS,
  };
}

/**
 * Returns a guaranteed expired token from previous window for testing rejection
 */
export function getExpiredTotp(secretKey: string = 'AWANPAY_CORP_2026', timeMs: number = Date.now()): string {
  return generateLiveTotp(secretKey, timeMs - (TOTP_PERIOD_SECONDS + 5) * 1000).code;
}

/**
 * Validate TOTP code.
 * Strictly verifies against the CURRENT active window ONLY.
 * Expired codes are explicitly detected and REJECTED.
 */
export function verifyTotpCode(
  inputCode: string,
  secretKey: string = 'AWANPAY_CORP_2026'
): { isValid: boolean; reason?: string; isExpired?: boolean } {
  const cleaned = inputCode.trim();
  if (cleaned.length !== 6 || !/^\d{6}$/.test(cleaned)) {
    return { isValid: false, reason: 'Format kode TOTP harus tepat 6 digit angka numerik.' };
  }

  const now = Date.now();
  const currentToken = generateLiveTotp(secretKey, now).code;
  const prevToken = generateLiveTotp(secretKey, now - TOTP_PERIOD_SECONDS * 1000).code;
  const olderToken = generateLiveTotp(secretKey, now - (TOTP_PERIOD_SECONDS * 2) * 1000).code;

  // STRICT REJECTION: If input was from an earlier cycle, reject as EXPIRED
  if (cleaned === prevToken || cleaned === olderToken) {
    return {
      isValid: false,
      isExpired: true,
      reason: `Kode TOTP (${cleaned}) sudah KADALUARSA. Siklus 30 detik telah berakhir. Harap gunakan kode aktif terbaru: ${currentToken}.`,
    };
  }

  // STRICT ACCEPTANCE: ONLY the current active token is accepted
  if (cleaned === currentToken) {
    return { isValid: true };
  }

  return {
    isValid: false,
    reason: `Kode TOTP (${cleaned}) salah atau tidak valid. Kode aktif saat ini: ${currentToken}.`,
  };
}
