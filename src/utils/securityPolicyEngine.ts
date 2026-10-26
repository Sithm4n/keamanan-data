import {
  UserRole,
  UserProfile,
  SecurityContext,
  TransactionPayload,
  RbacEvaluation,
  AbacEvaluation,
  MfaEvaluation,
  PolicyEvaluationResult,
} from '../types/security';

export const OFFICE_SUBNET_CIDR = '192.168.10.0/24';
export const WORK_HOURS_START = '08:00';
export const WORK_HOURS_END = '17:00';
export const STAFF_TRANSACTION_LIMIT = 50_000_000; // Rp 50.000.000
export const MFA_THRESHOLD_AMOUNT = 10_000_000; // Rp 10.000.000

export const DAY_NAMES_ID = [
  'Minggu', // 0
  'Senin',  // 1
  'Selasa', // 2
  'Rabu',   // 3
  'Kamis',  // 4
  'Jumat',  // 5
  'Sabtu',  // 6
];

/**
 * Checks whether an IPv4 address belongs to a CIDR subnet (e.g. 192.168.10.0/24)
 */
export function isIpInSubnet(ip: string, cidr: string): boolean {
  try {
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits) || bits < 0 || bits > 32) return false;

    const ipToInt = (addr: string): number => {
      const parts = addr.split('.').map((p) => parseInt(p, 10));
      if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
        throw new Error('Invalid IPv4');
      }
      return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    };

    const targetInt = ipToInt(ip.trim());
    const rangeInt = ipToInt(range.trim());
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;

    return (targetInt & mask) === (rangeInt & mask);
  } catch {
    return false;
  }
}

/**
 * Parses "HH:mm" time string into minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Format IDR currency
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get current WIB time representation
 */
export function getCurrentWibContext(): { day: number; timeStr: string } {
  const now = new Date();
  // Adjust for UTC+7 (WIB)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wibDate = new Date(utc + 3600000 * 7);

  const day = wibDate.getDay();
  const hours = String(wibDate.getHours()).padStart(2, '0');
  const mins = String(wibDate.getMinutes()).padStart(2, '0');
  return {
    day,
    timeStr: `${hours}:${mins}`,
  };
}

/**
 * ============================================================================
 * 1. RBAC (Role-Based Access Control) Module
 * ============================================================================
 * Rule: User must have an authorized corporate role ('Finance Staff' | 'Finance Manager').
 */
export function evaluateRbac(user: UserProfile): RbacEvaluation {
  const permittedRoles: UserRole[] = ['Finance Staff', 'Finance Manager'];
  const hasValidRole = permittedRoles.includes(user.role);

  if (hasValidRole) {
    return {
      passed: true,
      userRole: user.role,
      permittedRoles,
      reason: `RBAC Lolos: Peran '${user.role}' terdaftar dan memiliki wewenang akses modul transaksi AwanPay.`,
    };
  }

  return {
    passed: false,
    userRole: user.role,
    permittedRoles,
    reason: `RBAC Ditolak: Peran '${user.role}' tidak memiliki izin transaksi pada dompet digital perusahaan.`,
  };
}

/**
 * ============================================================================
 * 2. ABAC (Attribute-Based Access Control) Module
 * ============================================================================
 * Rules:
 * a) Nominal Transaksi: Finance Staff maks Rp 50.000.000. Di atas Rp 50.000.000 wajib Finance Manager.
 * b) Hari Kerja: Senin–Jumat (1–5) WIB.
 * c) Jam Kerja: 08:00–17:00 WIB.
 * d) Subnet IP Kantor: Wajib 192.168.10.0/24.
 */
export function evaluateAbac(
  user: UserProfile,
  payload: TransactionPayload,
  context: SecurityContext
): AbacEvaluation {
  const violations: string[] = [];

  // 1. Attribute: Nominal vs Role Limit
  let maxAllowed = STAFF_TRANSACTION_LIMIT;
  if (user.role === 'Finance Manager') {
    maxAllowed = 1_000_000_000; // Rp 1 Milyar limit Manager
  }

  const amountPassed = payload.amount <= maxAllowed;
  const isEscalationNeeded = user.role === 'Finance Staff' && !amountPassed;

  const amountReason = amountPassed
    ? `Limit Nominal Lolos: Nominal ${formatIDR(payload.amount)} memenuhi batas kewenangan ${user.role} (Maks. ${formatIDR(maxAllowed)}).`
    : `Memerlukan Otorisasi Manager: Nominal ${formatIDR(payload.amount)} melebihi batas kewenangan mandiri Finance Staff (Maks. ${formatIDR(maxAllowed)}). Transaksi berstatus PENDING dan wajib disetujui oleh Finance Manager.`;

  if (!amountPassed) {
    violations.push(amountReason);
  }

  // 2. Attribute: Hari Kerja (Senin=1 s/d Jumat=5)
  const isWorkday = context.simulatedDay >= 1 && context.simulatedDay <= 5;
  const dayName = DAY_NAMES_ID[context.simulatedDay] || 'Tidak Diketahui';
  const workdayReason = isWorkday
    ? `Hari Operasional Lolos: Transaksi diajukan pada hari ${dayName} (Hari kerja diizinkan: Senin–Jumat).`
    : `Hari Operasional Ditolak: Transaksi diajukan pada hari ${dayName} (Di luar hari kerja kantor: hanya Senin–Jumat).`;

  if (!isWorkday) {
    violations.push(workdayReason);
  }

  // 3. Attribute: Jam Kerja (08:00 - 17:00 WIB)
  const currentMinutes = parseTimeToMinutes(context.simulatedTime);
  const startMinutes = parseTimeToMinutes(WORK_HOURS_START);
  const endMinutes = parseTimeToMinutes(WORK_HOURS_END);

  const inWindow = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  const timeReason = inWindow
    ? `Jam Kerja Lolos: Pukul ${context.simulatedTime} WIB berada dalam rentang jam operasional (${WORK_HOURS_START}–${WORK_HOURS_END} WIB).`
    : `Jam Kerja Ditolak: Pukul ${context.simulatedTime} WIB berada di luar jam operasional (${WORK_HOURS_START}–${WORK_HOURS_END} WIB). Transaksi dilarang di luar jam kantor.`;

  if (!inWindow) {
    violations.push(timeReason);
  }

  // 4. Attribute: Alamat IP Subnet (192.168.10.0/24)
  const inSubnet = isIpInSubnet(context.clientIp, OFFICE_SUBNET_CIDR);
  const ipReason = inSubnet
    ? `Subnet Jaringan Lolos: Alamat IP ${context.clientIp} terverifikasi berasal dari subnet kantor (${OFFICE_SUBNET_CIDR}).`
    : `Subnet Jaringan Ditolak: Alamat IP ${context.clientIp} berada di luar subnet resmi kantor (${OFFICE_SUBNET_CIDR}). Akses dari jaringan publik/eksternal diblokir.`;

  if (!inSubnet) {
    violations.push(ipReason);
  }

  const allPassed = amountPassed && isWorkday && inWindow && inSubnet;

  return {
    passed: allPassed,
    amountRule: {
      passed: amountPassed,
      amount: payload.amount,
      maxAllowed,
      reason: amountReason,
    },
    workdayRule: {
      passed: isWorkday,
      dayNumber: context.simulatedDay,
      dayName,
      isWorkday,
      reason: workdayReason,
    },
    timeWindowRule: {
      passed: inWindow,
      timeString: context.simulatedTime,
      allowedRange: `${WORK_HOURS_START}–${WORK_HOURS_END} WIB`,
      inWindow,
      reason: timeReason,
    },
    ipSubnetRule: {
      passed: inSubnet,
      clientIp: context.clientIp,
      allowedSubnet: OFFICE_SUBNET_CIDR,
      inSubnet,
      reason: ipReason,
    },
    reasons: violations,
  };
}

/**
 * ============================================================================
 * 3. MFA Gatekeeper Module
 * ============================================================================
 * Rule:
 * Nominal <= Rp 10.000.000 -> Tidak membutuhkan MFA (bypassed)
 * Nominal > Rp 10.000.000 -> Wajib MFA (TOTP 6-digit / Biometrik)
 */
export function checkMfaRequirement(amount: number): boolean {
  return amount > MFA_THRESHOLD_AMOUNT;
}

export function requiresManagerEscalation(user: UserProfile, amount: number): boolean {
  return user.role === 'Finance Staff' && amount > STAFF_TRANSACTION_LIMIT;
}

/**
 * ============================================================================
 * Unified Policy Evaluation Engine
 * ============================================================================
 */
export function evaluateTransactionPolicy(
  user: UserProfile,
  payload: TransactionPayload,
  context: SecurityContext,
  mfaVerified: boolean = false,
  mfaMethod?: 'TOTP_AUTH' | 'BIOMETRIC_WEBAUTHN'
): PolicyEvaluationResult {
  const rbacResult = evaluateRbac(user);
  const abacResult = evaluateAbac(user, payload, context);
  const isMfaReq = checkMfaRequirement(payload.amount);

  const mfaResult: MfaEvaluation = {
    required: isMfaReq,
    passed: isMfaReq ? mfaVerified : true,
    method: mfaMethod,
    reason: isMfaReq
      ? mfaVerified
        ? `MFA Terverifikasi: Transaksi > Rp10.000.000 berhasil divalidasi via ${mfaMethod === 'BIOMETRIC_WEBAUTHN' ? 'Biometrik' : 'TOTP 6-digit'}.`
        : `MFA Gagal / Belum Terverifikasi: Transaksi > Rp10.000.000 wajib verifikasi TOTP/Biometrik.`
      : `MFA Bypass: Nominal transaksi ${formatIDR(payload.amount)} ≤ Rp10.000.000, langsung diproses ke evaluasi otorisasi.`,
  };

  const allViolations: string[] = [];

  if (!rbacResult.passed) {
    allViolations.push(rbacResult.reason);
  }
  if (!abacResult.passed) {
    allViolations.push(...abacResult.reasons);
  }
  if (isMfaReq && !mfaVerified) {
    allViolations.push(`MFA: Verifikasi dua faktor (TOTP 6-digit / Biometrik) gagal atau dibatalkan.`);
  }

  const overallPassed = rbacResult.passed && abacResult.passed && mfaResult.passed;
  const primaryDenialReason = allViolations.length > 0 ? allViolations[0] : undefined;

  return {
    overallPassed,
    rbac: rbacResult,
    abac: abacResult,
    mfa: mfaResult,
    primaryDenialReason,
    allViolations,
  };
}
