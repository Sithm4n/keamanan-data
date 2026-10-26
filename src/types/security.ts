export type UserRole = 'Finance Staff' | 'Finance Manager';

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  employeeId: string;
  department: string;
  password?: string;
  avatarUrl?: string;
}

export interface SecurityContext {
  clientIp: string;
  simulatedDay: number; // 0=Minggu, 1=Senin, ..., 5=Jumat, 6=Sabtu
  simulatedTime: string; // "HH:mm" in 24h WIB
  useRealTime: boolean;
}

export interface TransactionPayload {
  recipientName: string;
  recipientAccount: string;
  bankName: string;
  amount: number;
  description: string;
  department: string;
}

export interface RbacEvaluation {
  passed: boolean;
  userRole: UserRole;
  permittedRoles: UserRole[];
  reason: string;
}

export interface AbacEvaluation {
  passed: boolean;
  amountRule: {
    passed: boolean;
    amount: number;
    maxAllowed: number;
    reason: string;
  };
  workdayRule: {
    passed: boolean;
    dayNumber: number;
    dayName: string;
    isWorkday: boolean;
    reason: string;
  };
  timeWindowRule: {
    passed: boolean;
    timeString: string;
    allowedRange: string;
    inWindow: boolean;
    reason: string;
  };
  ipSubnetRule: {
    passed: boolean;
    clientIp: string;
    allowedSubnet: string;
    inSubnet: boolean;
    reason: string;
  };
  reasons: string[];
}

export interface MfaEvaluation {
  required: boolean;
  passed: boolean;
  method?: 'TOTP_AUTH' | 'BIOMETRIC_WEBAUTHN';
  verifiedCode?: string;
  reason?: string;
}

export interface PolicyEvaluationResult {
  overallPassed: boolean;
  rbac: RbacEvaluation;
  abac: AbacEvaluation;
  mfa: MfaEvaluation;
  primaryDenialReason?: string;
  allViolations: string[];
}

export interface AuditLogEntry {
  id: string;
  referenceNo: string;
  timestamp: string;
  actor: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
    ip: string;
  };
  transaction: TransactionPayload;
  status: 'APPROVED' | 'DENIED' | 'PENDING';
  mfaStatus: 'BYPASSED' | 'VERIFIED' | 'FAILED' | 'SKIPPED';
  mfaMethod?: 'TOTP_AUTH' | 'BIOMETRIC_WEBAUTHN';
  rbacPassed: boolean;
  abacPassed: boolean;
  primaryReason: string;
  detailedViolations: string[];
  escalatedToManager?: boolean;
  managerDecision?: {
    decidedBy: string;
    decidedAt: string;
    decision: 'APPROVED' | 'DENIED';
    notes?: string;
  };
  contextSnapshot: {
    ip: string;
    dayName: string;
    timeWib: string;
    allowedSubnet: string;
    allowedHours: string;
    roleLimit: number;
  };
}
