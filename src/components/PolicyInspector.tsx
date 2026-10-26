import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  KeyRound,
  Network,
  Clock,
  Calendar,
  DollarSign,
  UserCheck,
} from 'lucide-react';
import { UserProfile, SecurityContext, TransactionPayload } from '../types/security';
import {
  evaluateRbac,
  evaluateAbac,
  checkMfaRequirement,
  formatIDR,
  STAFF_TRANSACTION_LIMIT,
  MFA_THRESHOLD_AMOUNT,
  OFFICE_SUBNET_CIDR,
  WORK_HOURS_START,
  WORK_HOURS_END,
} from '../utils/securityPolicyEngine';

interface PolicyInspectorProps {
  currentUser: UserProfile;
  context: SecurityContext;
  transaction: TransactionPayload;
}

export const PolicyInspector: React.FC<PolicyInspectorProps> = ({
  currentUser,
  context,
  transaction,
}) => {
  const rbacResult = evaluateRbac(currentUser);
  const abacResult = evaluateAbac(currentUser, transaction, context);
  const isMfaRequired = checkMfaRequirement(transaction.amount);

  const isTransactionAllowed = rbacResult.passed && abacResult.passed;
  const isStaffExceedingLimit = currentUser.role === 'Finance Staff' && transaction.amount > STAFF_TRANSACTION_LIMIT;
  const isEnvValid = abacResult.workdayRule.passed && abacResult.timeWindowRule.passed && abacResult.ipSubnetRule.passed;
  const isPendingEscalation = isStaffExceedingLimit && isEnvValid && rbacResult.passed;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Title & Overall Readiness Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Live Access Control Policy Inspector
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Evaluasi otorisasi terstruktur secara real-time: RBAC (Peran), ABAC (Atribut Dinamis), dan MFA Gatekeeper
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isTransactionAllowed ? (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-lg shadow-xs">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>OTORISASI MEMENUHI SYARAT (APPROVED)</span>
            </div>
          ) : isPendingEscalation ? (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-lg shadow-xs">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>DIESKALASI KE MANAGER: STATUS PENDING</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-700 bg-rose-50 border border-rose-300 px-3 py-1.5 rounded-lg shadow-xs">
              <X className="w-4 h-4 text-rose-600" />
              <span>OTORISASI DITOLAK (DENIED)</span>
            </div>
          )}
        </div>
      </div>

      {/* 3 Pillars Grid: Placed full-width so everything is spacious and fully readable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pillar 1: RBAC Module */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>1. Modul RBAC (Role-Based)</span>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                rbacResult.passed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {rbacResult.passed ? 'PASSED' : 'DENIED'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Peran Pengguna Aktif:</span>
              <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {currentUser.role}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Peran Terdaftar:</span>
              <span className="font-mono text-[11px] text-slate-700 font-semibold">
                Staff / Manager
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <p className="text-[11px] text-slate-600 leading-relaxed">
                RBAC memvalidasi apakah kredensial pengguna terdaftar sebagai jabatan formal yang sah untuk mengakses sistem perbankan korporat AwanPay.
              </p>
            </div>
          </div>
        </div>

        {/* Pillar 2: ABAC Module */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>2. Modul ABAC (Attribute-Based)</span>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                abacResult.passed
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {abacResult.passed ? 'PASSED' : 'DENIED'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* ABAC Check 1: Limit Nominal Role */}
            <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-600 flex items-center gap-1 font-medium">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                Limit Peran ({currentUser.role === 'Finance Manager' ? 'Manager' : 'Staff'}):
              </span>
              <span
                className={`font-mono text-xs font-bold flex items-center gap-1 ${
                  abacResult.amountRule.passed ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {abacResult.amountRule.passed ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                {formatIDR(abacResult.amountRule.maxAllowed)}
              </span>
            </div>

            {/* ABAC Check 2: Subnet IP */}
            <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-600 flex items-center gap-1 font-medium">
                <Network className="w-3.5 h-3.5 text-slate-400" />
                Subnet {OFFICE_SUBNET_CIDR}:
              </span>
              <span
                className={`font-mono text-xs font-bold flex items-center gap-1 ${
                  abacResult.ipSubnetRule.passed ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {abacResult.ipSubnetRule.passed ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                {abacResult.ipSubnetRule.passed ? 'Kantor Valid' : 'Luar Subnet'}
              </span>
            </div>

            {/* ABAC Check 3: Hari Operasional */}
            <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-600 flex items-center gap-1 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Hari Kerja (Senin–Jumat):
              </span>
              <span
                className={`font-mono text-xs font-bold flex items-center gap-1 ${
                  abacResult.workdayRule.passed ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {abacResult.workdayRule.passed ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                {abacResult.workdayRule.dayName}
              </span>
            </div>

            {/* ABAC Check 4: Jam Operasional */}
            <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-600 flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Jam Kerja (08:00–17:00):
              </span>
              <span
                className={`font-mono text-xs font-bold flex items-center gap-1 ${
                  abacResult.timeWindowRule.passed ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {abacResult.timeWindowRule.passed ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                {context.simulatedTime} WIB
              </span>
            </div>
          </div>
        </div>

        {/* Pillar 3: MFA Gatekeeper */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>3. Gatekeeper MFA Berlapis</span>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                isMfaRequired
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-slate-200 text-slate-700 border border-slate-300'
              }`}
            >
              {isMfaRequired ? 'MFA WAJIB' : 'MFA BYPASS'}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Threshold Nominal MFA:</span>
              <span className="font-mono text-xs font-bold text-slate-800">
                &gt; {formatIDR(MFA_THRESHOLD_AMOUNT)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Status Pengiriman Ini:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded ${
                  isMfaRequired
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold'
                }`}
              >
                {isMfaRequired ? 'Trigger Modal TOTP' : 'Langsung Proses'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {isMfaRequired ? (
                  <span className="text-amber-800 font-medium">
                    Nominal melebihi Rp10.000.000. Saat tombol &quot;Kirim Dana&quot; ditekan, modal pop-up verifikasi TOTP 6-digit / Biometrik akan muncul untuk otorisasi tambahan.
                  </span>
                ) : (
                  <span className="text-slate-600">
                    Nominal transaksi ≤ Rp10.000.000, transaksi dapat diproses langsung ke evaluasi otorisasi tanpa meminta verifikasi TOTP.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Violation Alert Box if any ABAC rules fail */}
      {abacResult.reasons.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Pemberitahuan Pelanggaran Kebijakan Keamanan (Security Violation Detected):</span>
          </div>
          <ul className="text-xs text-rose-700 list-disc list-inside space-y-1 pl-1 font-mono text-[11px]">
            {abacResult.reasons.map((r, idx) => (
              <li key={idx} className="leading-relaxed">
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
