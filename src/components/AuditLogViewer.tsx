import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  RotateCcw,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { AuditLogEntry, UserRole } from '../types/security';
import { formatIDR } from '../utils/securityPolicyEngine';
import { LogDetailModal } from './LogDetailModal';

interface AuditLogViewerProps {
  logs: AuditLogEntry[];
  onResetLogs: () => void;
  onClearLogs?: () => void;
  onLoadSampleLogs?: () => void;
  currentUserRole?: UserRole;
  onApprovePending?: (logId: string) => void;
  onDenyPending?: (logId: string) => void;
  onGoToTransaction?: () => void;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  logs,
  onResetLogs,
  onClearLogs,
  onLoadSampleLogs,
  currentUserRole,
  onApprovePending,
  onDenyPending,
  onGoToTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'DENIED' | 'PENDING'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const isManager = currentUserRole === 'Finance Manager';

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Status filter
      if (statusFilter !== 'ALL' && log.status !== statusFilter) {
        return false;
      }
      // Role filter
      if (roleFilter !== 'ALL' && log.actor.role !== roleFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesRef = log.referenceNo.toLowerCase().includes(query);
        const matchesActor = log.actor.fullName.toLowerCase().includes(query);
        const matchesRecipient = log.transaction.recipientName.toLowerCase().includes(query);
        const matchesReason = log.primaryReason.toLowerCase().includes(query);
        const matchesIp = log.actor.ip.toLowerCase().includes(query);
        return matchesRef || matchesActor || matchesRecipient || matchesReason || matchesIp;
      }
      return true;
    });
  }, [logs, statusFilter, roleFilter, searchTerm]);

  // Statistics
  const totalCount = logs.length;
  const approvedCount = logs.filter((l) => l.status === 'APPROVED').length;
  const pendingCount = logs.filter((l) => l.status === 'PENDING').length;
  const deniedCount = logs.filter((l) => l.status === 'DENIED').length;
  const mfaVerifiedCount = logs.filter((l) => l.mfaStatus === 'VERIFIED').length;

  const exportCsv = () => {
    const headers = [
      'Log ID',
      'Reference No',
      'Timestamp',
      'Actor Name',
      'Actor Role',
      'Client IP',
      'Recipient',
      'Bank',
      'Amount (IDR)',
      'Status',
      'MFA Status',
      'RBAC Passed',
      'ABAC Passed',
      'Primary Reason',
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${l.referenceNo}"`,
      `"${l.timestamp}"`,
      `"${l.actor.fullName}"`,
      `"${l.actor.role}"`,
      `"${l.actor.ip}"`,
      `"${l.transaction.recipientName}"`,
      `"${l.transaction.bankName}"`,
      l.transaction.amount,
      `"${l.status}"`,
      `"${l.mfaStatus}"`,
      l.rbacPassed ? 'TRUE' : 'FALSE',
      l.abacPassed ? 'TRUE' : 'FALSE',
      `"${l.primaryReason.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `awanpay_security_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `awanpay_security_audit_logs_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row: 5 Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 block font-medium">Total Evaluasi</span>
          <div className="text-2xl font-mono font-bold text-slate-900 mt-1 tabular-nums">
            {totalCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Semua transaksi
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-emerald-700 block font-bold">Approved</span>
          <div className="text-2xl font-mono font-bold text-emerald-600 mt-1 tabular-nums">
            {approvedCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Otorisasi Lolos
          </span>
        </div>

        <div className="bg-white border border-amber-300 rounded-2xl p-4 shadow-xs bg-amber-50/40">
          <span className="text-xs text-amber-800 block font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Manager
          </span>
          <div className="text-2xl font-mono font-bold text-amber-700 mt-1 tabular-nums">
            {pendingCount}
          </div>
          <span className="text-[11px] text-amber-700 mt-0.5 block">
            Pengajuan Staf &gt; 50Jt
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-rose-700 block font-bold">Denied</span>
          <div className="text-2xl font-mono font-bold text-rose-600 mt-1 tabular-nums">
            {deniedCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Pelanggaran Aturan
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <span className="text-xs text-blue-700 block font-bold">MFA Valid (&gt; 10M)</span>
          <div className="text-2xl font-mono font-bold text-blue-600 mt-1 tabular-nums">
            {mfaVerifiedCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Validasi TOTP
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari no referensi, nama penerima, aktor, atau IP..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          {/* Action Buttons: Export & Reset */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportCsv}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={exportJson}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Export JSON</span>
            </button>
            {logs.length > 0 ? (
              <button
                onClick={onClearLogs || onResetLogs}
                title="Kosongkan semua log audit"
                className="px-2.5 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Kosongkan Log</span>
              </button>
            ) : (
              onLoadSampleLogs && (
                <button
                  onClick={onLoadSampleLogs}
                  title="Muat data contoh pengujian (opsional)"
                  className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Muat Sampel</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Filter Badges Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs">
          {/* Status Segmented Control */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-400" /> Status:
            </span>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('DENIED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === 'DENIED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Denied ({deniedCount})
            </button>
          </div>

          {/* Role Segmented Control */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-slate-500 font-semibold mr-1">Peran:</span>
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                roleFilter === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Peran
            </button>
            <button
              onClick={() => setRoleFilter('Finance Staff')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                roleFilter === 'Finance Staff'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Finance Staff
            </button>
            <button
              onClick={() => setRoleFilter('Finance Manager')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                roleFilter === 'Finance Manager'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Finance Manager
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3.5 px-4 whitespace-nowrap">Waktu &amp; Ref ID</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Aktor &amp; Peran</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Penerima &amp; Nominal</th>
                <th className="py-3.5 px-4 whitespace-nowrap">MFA Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Status Otorisasi</th>
                <th className="py-3.5 px-4">Alasan &amp; Pelanggaran Kebijakan</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Aksi Keputusan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                        <ShieldCheck className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">Log Audit Bersih (Kosong)</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Seluruh data dummy telah dihilangkan. Anda sekarang dapat menginput transaksi satu per satu melalui formulir untuk melihat pencatatan log audit dan sinkronisasi database secara langsung.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2 flex-wrap justify-center">
                        {onGoToTransaction && (
                          <button
                            onClick={onGoToTransaction}
                            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span>Mulai Input Transaksi</span>
                          </button>
                        )}
                        {onLoadSampleLogs && (
                          <button
                            onClick={onLoadSampleLogs}
                            className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Muat Data Contoh</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ShieldCheck className="w-8 h-8 text-slate-300" />
                      <p className="text-xs text-slate-600">Tidak ada log audit keamanan yang cocok dengan kriteria pencarian.</p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setStatusFilter('ALL');
                          setRoleFilter('ALL');
                        }}
                        className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isAppr = log.status === 'APPROVED';
                  const isPending = log.status === 'PENDING';
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Col 1: Waktu & Ref */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-slate-900">
                          {log.referenceNo}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {log.timestamp}
                        </div>
                      </td>

                      {/* Col 2: Actor & Role */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{log.actor.fullName}</div>
                        <div className="text-[11px] font-mono text-blue-700 font-semibold">{log.actor.role}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          IP: {log.actor.ip}
                        </div>
                      </td>

                      {/* Col 3: Recipient & Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 truncate max-w-[170px]">
                          {log.transaction.recipientName}
                        </div>
                        <div className="font-mono font-bold text-blue-600 text-xs tabular-nums">
                          {formatIDR(log.transaction.amount)}
                        </div>
                        <div className="text-[11px] text-slate-500">{log.transaction.bankName}</div>
                      </td>

                      {/* Col 4: MFA Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.mfaStatus === 'VERIFIED' && (
                          <span className="text-[11px] font-mono text-emerald-700 flex items-center gap-1 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            VERIFIED (TOTP)
                          </span>
                        )}
                        {log.mfaStatus === 'BYPASSED' && (
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 font-medium">
                            BYPASSED (≤10M)
                          </span>
                        )}
                        {log.mfaStatus === 'FAILED' && (
                          <span className="text-[11px] font-mono text-rose-700 flex items-center gap-1 font-bold">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            GAGAL
                          </span>
                        )}
                        {log.mfaStatus === 'SKIPPED' && (
                          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            — DIBATALKAN
                          </span>
                        )}
                      </td>

                      {/* Col 5: Security Decision */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isAppr ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            APPROVED
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            PENDING (MANAGER)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-rose-50 text-rose-800 border border-rose-300">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            DENIED
                          </span>
                        )}
                      </td>

                      {/* Col 6: Reason */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <p
                          className={`text-xs line-clamp-2 leading-relaxed ${
                            isAppr
                              ? 'text-slate-700 font-medium'
                              : isPending
                              ? 'text-amber-900 font-semibold'
                              : 'text-rose-700 font-medium'
                          }`}
                        >
                          {log.primaryReason}
                        </p>
                      </td>

                      {/* Col 7: Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* If PENDING and user is Manager: Quick inline Approve/Deny buttons */}
                          {isPending && isManager && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onApprovePending?.(log.id);
                                }}
                                title="Setujui transaksi ini (debet saldo kas)"
                                className="px-2 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDenyPending?.(log.id);
                                }}
                                title="Tolak permohonan transaksi staf"
                                className="px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <ThumbsDown className="w-3 h-3" />
                                <span>Tolak</span>
                              </button>
                            </>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Detail</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forensic Inspection Modal */}
      <LogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        currentUserRole={currentUserRole}
        onApprovePending={onApprovePending}
        onDenyPending={onDenyPending}
      />
    </div>
  );
};
