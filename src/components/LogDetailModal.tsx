import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Terminal,
  Clock,
  Network,
  User,
  DollarSign,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { AuditLogEntry, UserRole } from '../types/security';
import { formatIDR } from '../utils/securityPolicyEngine';

interface LogDetailModalProps {
  log: AuditLogEntry | null;
  onClose: () => void;
  currentUserRole?: UserRole;
  onApprovePending?: (logId: string) => void;
  onDenyPending?: (logId: string) => void;
}

export const LogDetailModal: React.FC<LogDetailModalProps> = ({
  log,
  onClose,
  currentUserRole,
  onApprovePending,
  onDenyPending,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewTab, setViewTab] = useState<'visual' | 'json'>('visual');

  if (!log) return null;

  const isApproved = log.status === 'APPROVED';
  const isPending = log.status === 'PENDING';
  const isManager = currentUserRole === 'Finance Manager';

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isApproved
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : isPending
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-rose-100 text-rose-700 border border-rose-300'
              }`}
            >
              {isApproved ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isPending ? (
                <Clock className="w-5 h-5 text-amber-700" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-500 font-bold">
                  {log.referenceNo}
                </span>
                <span className="text-slate-300">·</span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    isApproved
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : isPending
                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                      : 'bg-rose-50 text-rose-800 border border-rose-300'
                  }`}
                >
                  {isPending ? 'PENDING (MENUNGGU MANAGER)' : log.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Rincian Audit Forensik Keamanan Transaksi
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewTab(viewTab === 'visual' ? 'json' : 'visual')}
              className="px-2.5 py-1 text-xs font-mono font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Terminal className="w-3.5 h-3.5 text-blue-600" />
              <span>{viewTab === 'visual' ? 'Raw JSON' : 'Visual Mode'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {viewTab === 'json' ? (
            <div className="relative">
              <button
                onClick={handleCopyJson}
                className="absolute top-3 right-3 px-2 py-1 text-xs font-mono bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 flex items-center gap-1 transition-colors shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin JSON'}</span>
              </button>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed">
                {JSON.stringify(log, null, 2)}
              </pre>
            </div>
          ) : (
            <>
              {/* Primary Verdict Summary Box */}
              <div
                className={`p-4 rounded-xl border space-y-1.5 ${
                  isApproved
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : isPending
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Kesimpulan Keputusan Kebijakan Keamanan:</span>
                </div>
                <p className="text-xs leading-relaxed font-mono font-medium">
                  {log.primaryReason}
                </p>

                {log.detailedViolations && log.detailedViolations.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 mt-2 space-y-1">
                    <span className="text-[11px] font-bold block">
                      Catatan Evaluasi / Pelanggaran:
                    </span>
                    <ul className="list-disc list-inside text-[11px] font-mono space-y-1">
                      {log.detailedViolations.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* If PENDING and user is Manager: Decision Action Card */}
              {isPending && isManager && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-blue-900">
                        Otorisasi Keputusan Finance Manager (Najwa)
                      </h4>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                        Pengajuan nominal {formatIDR(log.transaction.amount)} dari {log.actor.fullName} membutuhkan persetujuan Anda.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => {
                        onApprovePending?.(log.id);
                        onClose();
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Setujui Transaksi (Potong Kas)</span>
                    </button>
                    <button
                      onClick={() => {
                        onDenyPending?.(log.id);
                        onClose();
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                      <span>Tolak Transaksi</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Grid 1: Transaction Information */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                  Parameter Transaksi
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Penerima &amp; Bank:</span>
                    <span className="font-bold text-slate-900">
                      {log.transaction.recipientName} ({log.transaction.bankName})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Nomor Rekening:</span>
                    <span className="font-mono text-slate-900 font-semibold">{log.transaction.recipientAccount}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Nominal Transfer:</span>
                    <span className="font-mono font-bold text-blue-600 text-sm">
                      {formatIDR(log.transaction.amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Departemen / Keperluan:</span>
                    <span className="text-slate-800 font-medium">{log.transaction.description}</span>
                  </div>
                </div>
              </div>

              {/* Grid 2: Actor & Environmental Context Snapshot */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Snapshot Konteks Pengguna &amp; Lingkungan (Evaluation Timestamp)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block text-[10px] mb-1 font-medium">Pengaju Transaksi</span>
                    <div className="font-bold text-slate-900">{log.actor.fullName}</div>
                    <div className="font-mono text-[11px] text-blue-600 font-semibold">{log.actor.role}</div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block text-[10px] mb-1 font-medium flex items-center gap-1">
                      <Network className="w-3 h-3 text-slate-400" />
                      Alamat IP Klien
                    </span>
                    <div className="font-mono text-xs font-bold text-slate-900">{log.actor.ip}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Subnet: {log.contextSnapshot?.allowedSubnet || '192.168.10.0/24'}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block text-[10px] mb-1 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Waktu &amp; Hari WIB
                    </span>
                    <div className="font-mono text-xs font-bold text-slate-900">
                      {log.contextSnapshot?.dayName}, {log.contextSnapshot?.timeWib} WIB
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Jam Kerja: 08:00–17:00
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 3: Authorization Engine Matrix (RBAC, ABAC, MFA) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                {/* RBAC Box */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">
                    Evaluasi RBAC
                  </div>
                  <div
                    className={`font-bold ${
                      log.rbacPassed ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {log.rbacPassed ? '✓ PERAN VALID' : '✗ PERAN TIDAK SAH'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Kewenangan: {log.actor.role}
                  </div>
                </div>

                {/* ABAC Box */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">
                    Evaluasi ABAC
                  </div>
                  <div
                    className={`font-bold ${
                      isPending ? 'text-amber-800' : log.abacPassed ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isPending ? '⏳ BUTUH APPROVE' : log.abacPassed ? '✓ ATRIBUT VALID' : '✗ ATRIBUT DITOLAK'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Subnet, Jam/Hari, Limit Peran
                  </div>
                </div>

                {/* MFA Box */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase font-bold">
                    Status MFA Berlapis
                  </div>
                  <div
                    className={`font-bold ${
                      log.mfaStatus === 'VERIFIED'
                        ? 'text-emerald-700'
                        : log.mfaStatus === 'BYPASSED'
                        ? 'text-blue-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {log.mfaStatus === 'VERIFIED' && '✓ TOTP TERVERIFIKASI'}
                    {log.mfaStatus === 'BYPASSED' && '○ BYPASS (≤ 10 JUTA)'}
                    {log.mfaStatus === 'FAILED' && '✗ MFA GAGAL / KADALUARSA'}
                    {log.mfaStatus === 'SKIPPED' && '— DIBATALKAN / SKIP'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Threshold: &gt; Rp10.000.000
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            Audit ID: {log.id} · Timestamp: {log.timestamp}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
