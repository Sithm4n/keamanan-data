import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Info,
  Clock,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
} from 'lucide-react';
import {
  UserProfile,
  SecurityContext,
  TransactionPayload,
  AuditLogEntry,
} from './types/security';
import { MOCK_USERS, INITIAL_AUDIT_LOGS, SAMPLE_AUDIT_LOGS, PRESET_TRANSACTIONS } from './data/mockData';
import {
  evaluateTransactionPolicy,
  formatIDR,
  checkMfaRequirement,
  DAY_NAMES_ID,
  STAFF_TRANSACTION_LIMIT,
} from './utils/securityPolicyEngine';
import { Header } from './components/Header';
import { EnvironmentSimulator } from './components/EnvironmentSimulator';
import { TransactionForm } from './components/TransactionForm';
import { PolicyInspector } from './components/PolicyInspector';
import { MfaModal } from './components/MfaModal';
import { AuditLogViewer } from './components/AuditLogViewer';
import { ArchitectureDrawer } from './components/ArchitectureDrawer';
import { LoginModal } from './components/LoginModal';
import { StaffManagementModal } from './components/StaffManagementModal';
import { TopUpModal } from './components/TopUpModal';
import { SupabaseModal } from './components/SupabaseModal';
import {
  pushTransactionToSupabase,
  updateDecisionInSupabase,
  fetchUsersFromSupabase,
  saveUserToSupabase,
  deleteUserFromSupabase,
  seedUsersToSupabase,
} from './lib/supabase';

export default function App() {
  // Registered users state (Manager can add/delete staff)
  const [users, setUsers] = useState<UserProfile[]>(MOCK_USERS);

  // Load registered users from Supabase public.users on startup
  useEffect(() => {
    fetchUsersFromSupabase().then((res) => {
      if (res.success && res.users.length > 0) {
        setUsers(res.users);
      } else if (res.tableExists && res.users.length === 0) {
        // Table exists but empty -> Seed initial accounts (Naja & Najwa)
        seedUsersToSupabase(MOCK_USERS);
      }
    });
  }, []);

  // Authentication State: Defaults to Naja (Finance Staff)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(MOCK_USERS[0]);
  const [activeTab, setActiveTab] = useState<'transaction' | 'audit_logs' | 'architecture'>('transaction');

  // Corporate Cash Balance: Stateful, decreases when transaction is APPROVED
  const [corporateBalance, setCorporateBalance] = useState<number>(1_450_800_000);

  // Staff Management Modal State (for Manager)
  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState(false);

  // Cash Top Up Modal State (for Manager)
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  // Supabase Connection & Live Sync Modal State
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [supabaseSyncCount, setSupabaseSyncCount] = useState(0);

  // Environment / Security Context (ABAC Attributes)
  const [securityContext, setSecurityContext] = useState<SecurityContext>(() => {
    return {
      clientIp: '192.168.10.45',
      simulatedDay: 3, // Rabu
      simulatedTime: '10:30',
      useRealTime: false,
    };
  });

  // Simulator Open state (default false, can be toggled by Manager)
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  // Active Transaction Form State
  const [transaction, setTransaction] = useState<TransactionPayload>({
    recipientName: PRESET_TRANSACTIONS[0].recipientName,
    recipientAccount: PRESET_TRANSACTIONS[0].recipientAccount,
    bankName: PRESET_TRANSACTIONS[0].bankName,
    amount: PRESET_TRANSACTIONS[0].amount,
    description: PRESET_TRANSACTIONS[0].description,
    department: PRESET_TRANSACTIONS[0].department,
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);

  // MFA Modal State
  const [isMfaOpen, setIsMfaOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback Notification Toast / Banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    logId?: string;
  } | null>(null);

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    setSimulatorOpen(false);
    setIsStaffManagementOpen(false);
    setNotification(null);
  };

  // Staff management callbacks
  const handleAddStaff = (newStaff: UserProfile) => {
    setUsers((prev) => [...prev, newStaff]);
    // Save to Supabase public.users asynchronously
    saveUserToSupabase(newStaff).then((res) => {
      if (res.success) {
        setSupabaseSyncCount((c) => c + 1);
      }
    });
  };

  const handleDeleteStaff = (staffId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== staffId));
    // Delete from Supabase public.users asynchronously
    deleteUserFromSupabase(staffId);
  };

  // Top Up Cash Balance handler (Finance Manager)
  const handleTopUpSuccess = (amount: number, source: string, description: string) => {
    setCorporateBalance((prev) => prev + amount);

    // Record top up event in audit logs for complete traceability
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const refNo = `TOPUP-${dateStr}-${randomSuffix}`;
    const logId = `LOG-TOP-${Date.now().toString().slice(-4)}`;

    const topUpLog: AuditLogEntry = {
      id: logId,
      referenceNo: refNo,
      timestamp: `${new Date().toLocaleDateString('id-ID')} ${securityContext.simulatedTime}:00 WIB`,
      actor: {
        id: currentUser!.id,
        username: currentUser!.username,
        fullName: currentUser!.fullName,
        role: currentUser!.role,
        ip: securityContext.clientIp,
      },
      transaction: {
        recipientName: 'Kas Induk AwanPay (Rekening Operasional)',
        recipientAccount: '008-9921-831',
        bankName: 'Bank Mandiri',
        amount,
        description: `${description} [Sumber: ${source}]`,
        department: 'Finance & Treasury Operations',
      },
      status: 'APPROVED',
      mfaStatus: 'BYPASSED',
      rbacPassed: true,
      abacPassed: true,
      primaryReason: `Injeksi Saldo Kas Berhasil: Penambahan dana sebesar ${formatIDR(amount)} oleh Finance Manager (${currentUser?.fullName || 'Najwa'}). Saldo baru: ${formatIDR(corporateBalance + amount)}.`,
      detailedViolations: [],
      contextSnapshot: {
        ip: securityContext.clientIp,
        dayName: DAY_NAMES_ID[securityContext.simulatedDay] || 'Senin',
        timeWib: securityContext.simulatedTime,
        allowedSubnet: '192.168.10.0/24',
        allowedHours: '08:00–17:00 WIB',
        roleLimit: 1000000000,
      },
    };

    setAuditLogs((prev) => [topUpLog, ...prev]);

    setNotification({
      type: 'success',
      title: 'Saldo Kas Berhasil Ditambahkan',
      message: `Injeksi likuiditas sebesar ${formatIDR(amount)} berhasil dilakukan oleh Finance Manager. Saldo kas saat ini menjadi ${formatIDR(corporateBalance + amount)}.`,
      logId: topUpLog.id,
    });
  };

  // Helper to record an audit log
  const recordAuditLog = (
    status: 'APPROVED' | 'DENIED' | 'PENDING',
    mfaStatus: 'BYPASSED' | 'VERIFIED' | 'FAILED' | 'SKIPPED',
    primaryReason: string,
    detailedViolations: string[],
    mfaMethod?: 'TOTP_AUTH' | 'BIOMETRIC_WEBAUTHN',
    escalatedToManager?: boolean
  ): AuditLogEntry => {
    if (!currentUser) throw new Error('No user authenticated');

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const refNo = `TRX-${dateStr}-${randomSuffix}`;
    const logId = `LOG-AWN-${Date.now().toString().slice(-4)}`;

    const newLog: AuditLogEntry = {
      id: logId,
      referenceNo: refNo,
      timestamp: `${new Date().toLocaleDateString('id-ID')} ${securityContext.simulatedTime}:00 WIB`,
      actor: {
        id: currentUser.id,
        username: currentUser.username,
        fullName: currentUser.fullName,
        role: currentUser.role,
        ip: securityContext.clientIp,
      },
      transaction: { ...transaction },
      status,
      mfaStatus,
      mfaMethod,
      rbacPassed: currentUser.role === 'Finance Staff' || currentUser.role === 'Finance Manager',
      abacPassed: status === 'APPROVED',
      primaryReason,
      detailedViolations,
      escalatedToManager,
      contextSnapshot: {
        ip: securityContext.clientIp,
        dayName: DAY_NAMES_ID[securityContext.simulatedDay] || 'Senin',
        timeWib: securityContext.simulatedTime,
        allowedSubnet: '192.168.10.0/24',
        allowedHours: '08:00–17:00 WIB',
        roleLimit: currentUser.role === 'Finance Manager' ? 1000000000 : 50000000,
      },
    };

    setAuditLogs((prev) => [newLog, ...prev]);

    // Push to Supabase asynchronously
    pushTransactionToSupabase(newLog).then((res) => {
      if (res.success) {
        setSupabaseSyncCount((c) => c + 1);
      }
    });

    return newLog;
  };

  // Submit transaction handler
  const handleSubmitTransaction = () => {
    if (!currentUser) return;
    setIsSubmitting(true);

    const requiresMfa = checkMfaRequirement(transaction.amount);

    if (requiresMfa) {
      // Nominal > Rp 10.000.000 -> Open MFA verification popup
      setIsMfaOpen(true);
      setIsSubmitting(false);
    } else {
      // Nominal <= Rp 10.000.000 -> Directly proceed to RBAC/ABAC authorization without TOTP!
      setTimeout(() => {
        executeAuthorizationPolicy(false, 'BYPASSED');
        setIsSubmitting(false);
      }, 350);
    }
  };

  // Execute policy evaluation after MFA step
  const executeAuthorizationPolicy = (
    mfaVerified: boolean,
    mfaStatus: 'BYPASSED' | 'VERIFIED' | 'FAILED' | 'SKIPPED',
    mfaMethod?: 'TOTP_AUTH' | 'BIOMETRIC_WEBAUTHN'
  ) => {
    if (!currentUser) return;

    // Check balance sufficiency
    if (corporateBalance < transaction.amount) {
      const denialReason = `Saldo Kas Tidak Mencukupi: Saldo kas saat ini ${formatIDR(corporateBalance)} tidak cukup untuk transfer ${formatIDR(transaction.amount)}.`;
      const log = recordAuditLog('DENIED', mfaStatus, denialReason, [denialReason], mfaMethod);
      setNotification({
        type: 'error',
        title: 'Transaksi Ditolak (Saldo Kas Kurang)',
        message: denialReason,
        logId: log.id,
      });
      return;
    }

    const evaluation = evaluateTransactionPolicy(
      currentUser,
      transaction,
      securityContext,
      mfaVerified,
      mfaMethod
    );

    // Rule: Jika Finance Staff melakukan pengajuan > Rp50.000.000, JANGAN langsung Denied! Ubah menjadi PENDING untuk keputusan Finance Manager
    const isStaffExceedingLimit = currentUser.role === 'Finance Staff' && transaction.amount > STAFF_TRANSACTION_LIMIT;
    const isEnvironmentPassed = evaluation.abac.workdayRule.passed && evaluation.abac.timeWindowRule.passed && evaluation.abac.ipSubnetRule.passed && evaluation.rbac.passed && evaluation.mfa.passed;

    if (isStaffExceedingLimit && isEnvironmentPassed) {
      const pendingReason = `Menunggu Persetujuan Manager: Nominal ${formatIDR(transaction.amount)} melebihi wewenang mandiri Finance Staff (Maks. Rp50.000.000). Berstatus PENDING untuk persetujuan Finance Manager (Najwa).`;
      const log = recordAuditLog(
        'PENDING',
        mfaStatus,
        pendingReason,
        [
          `Memerlukan Otorisasi Manager: Nominal ${formatIDR(transaction.amount)} melebihi batas kewenangan mandiri Finance Staff (Maks. Rp50.000.000). Transaksi berstatus PENDING dan menunggu keputusan Finance Manager (Najwa).`,
        ],
        mfaMethod,
        true
      );

      setNotification({
        type: 'info',
        title: 'Pengajuan Diteruskan ke Manager (STATUS: PENDING)',
        message: `Nominal ${formatIDR(transaction.amount)} melebihi batas kewenangan mandiri Finance Staff. Transaksi telah dialihkan dengan status PENDING dan menunggu keputusan persetujuan Finance Manager (Najwa). Saldo kas belum berkurang hingga disetujui.`,
        logId: log.id,
      });
      return;
    }

    if (evaluation.overallPassed) {
      // DEDUCT CORPORATE BALANCE UPON APPROVAL!
      setCorporateBalance((prev) => Math.max(0, prev - transaction.amount));

      const log = recordAuditLog(
        'APPROVED',
        mfaStatus,
        `Transaksi disetujui: ${
          mfaStatus === 'BYPASSED'
            ? 'Nominal ≤ Rp10.000.000 (MFA Bypass). Aturan RBAC dan ABAC valid. Saldo kas telah didebet.'
            : `MFA berhasil diverifikasi via ${mfaMethod === 'BIOMETRIC_WEBAUTHN' ? 'Biometrik' : 'TOTP'}. Seluruh kebijakan RBAC & ABAC terpenuhi. Saldo kas telah didebet.`
        }`,
        [],
        mfaMethod
      );

      setNotification({
        type: 'success',
        title: 'Transaksi Berhasil Diotorisasi (APPROVED)',
        message: `Pengiriman dana sebesar ${formatIDR(
          transaction.amount
        )} ke ${transaction.recipientName} telah disetujui. Saldo kas operasional telah berkurang sesuai nominal.`,
        logId: log.id,
      });
    } else {
      const primaryReason =
        evaluation.primaryDenialReason || 'Otorisasi ditolak oleh kebijakan keamanan.';
      const log = recordAuditLog(
        'DENIED',
        mfaStatus,
        primaryReason,
        evaluation.allViolations,
        mfaMethod
      );

      setNotification({
        type: 'error',
        title: 'Transaksi Ditolak (DENIED)',
        message: primaryReason,
        logId: log.id,
      });
    }
  };

  // Manager Approval Action
  const handleApprovePending = (logId: string) => {
    const target = auditLogs.find((l) => l.id === logId && l.status === 'PENDING');
    if (!target) return;

    if (corporateBalance < target.transaction.amount) {
      setNotification({
        type: 'error',
        title: 'Gagal Menyetujui',
        message: `Saldo kas operasional (${formatIDR(corporateBalance)}) tidak cukup untuk nominal ${formatIDR(target.transaction.amount)}.`,
      });
      return;
    }

    // Deduct corporate balance upon Manager approval
    setCorporateBalance((prev) => Math.max(0, prev - target.transaction.amount));

    // Update log entry to APPROVED
    setAuditLogs((prev) =>
      prev.map((l) => {
        if (l.id === logId) {
          return {
            ...l,
            status: 'APPROVED',
            primaryReason: `Disetujui oleh Finance Manager (${currentUser?.fullName || 'Najwa'}): Otorisasi eskalasi transaksi nominal ${formatIDR(l.transaction.amount)} telah disahkan dan saldo kas didebet.`,
            detailedViolations: [],
            managerDecision: {
              decidedBy: currentUser?.fullName || 'Najwa',
              decidedAt: new Date().toLocaleTimeString('id-ID') + ' WIB',
              decision: 'APPROVED',
            },
          };
        }
        return l;
      })
    );

    setNotification({
      type: 'success',
      title: 'Transaksi Berhasil Disetujui Manager (APPROVED)',
      message: `Transaksi ${target.referenceNo} sebesar ${formatIDR(target.transaction.amount)} telah disahkan oleh Finance Manager. Saldo kas operasional telah dipotong.`,
      logId: target.id,
    });

    // Update status in Supabase
    updateDecisionInSupabase(
      target.referenceNo,
      'APPROVED',
      currentUser?.fullName || 'Najwa',
      `Disetujui oleh Finance Manager (${currentUser?.fullName || 'Najwa'})`
    );
  };

  // Manager Denial Action
  const handleDenyPending = (logId: string) => {
    const target = auditLogs.find((l) => l.id === logId && l.status === 'PENDING');
    if (!target) return;

    setAuditLogs((prev) =>
      prev.map((l) => {
        if (l.id === logId) {
          return {
            ...l,
            status: 'DENIED',
            primaryReason: `Ditolak oleh Finance Manager (${currentUser?.fullName || 'Najwa'}): Permohonan pengeluaran dana ditolak atas pertimbangan manajerial.`,
            detailedViolations: [
              `Ditolak oleh Finance Manager: Pengeluaran dana nominal ${formatIDR(l.transaction.amount)} tidak disetujui.`,
            ],
            managerDecision: {
              decidedBy: currentUser?.fullName || 'Najwa',
              decidedAt: new Date().toLocaleTimeString('id-ID') + ' WIB',
              decision: 'DENIED',
            },
          };
        }
        return l;
      })
    );

    setNotification({
      type: 'error',
      title: 'Transaksi Ditolak Manager (DENIED)',
      message: `Transaksi ${target.referenceNo} sebesar ${formatIDR(target.transaction.amount)} telah ditolak oleh Finance Manager. Saldo kas tidak berubah.`,
      logId: target.id,
    });

    // Update status in Supabase
    updateDecisionInSupabase(
      target.referenceNo,
      'DENIED',
      currentUser?.fullName || 'Najwa',
      `Ditolak oleh Finance Manager (${currentUser?.fullName || 'Najwa'})`
    );
  };

  // MFA Callback when TOTP/Biometric succeeds
  const handleMfaSuccess = (
    method: 'TOTP_AUTH' | 'BIOMETRIC_WEBAUTHN',
    verifiedCode?: string
  ) => {
    setIsMfaOpen(false);
    executeAuthorizationPolicy(true, 'VERIFIED', method);
  };

  // MFA Callback when user cancels or validation fails
  const handleMfaCancel = (reason: string) => {
    setIsMfaOpen(false);
    if (!currentUser) return;

    const log = recordAuditLog(
      'DENIED',
      'FAILED',
      `MFA Gagal / Dibatalkan: ${reason}. Transaksi di atas Rp10.000.000 wajib diverifikasi dua faktor secara valid.`,
      ['Verifikasi TOTP / Biometrik tidak valid, kadaluarsa, atau dibatalkan oleh pengguna sebelum otorisasi selesai.']
    );

    setNotification({
      type: 'error',
      title: 'Transaksi Dibatalkan (MFA Gagal)',
      message: reason || 'Transaksi dibatalkan karena verifikasi kode TOTP tidak berhasil.',
      logId: log.id,
    });
  };

  // If logged out, render 2-step Login screen
  if (!currentUser) {
    return (
      <LoginModal
        users={users}
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          if (u.role === 'Finance Manager') {
            setSimulatorOpen(true);
          } else {
            setSimulatorOpen(false);
          }
        }}
      />
    );
  }

  const isManager = currentUser.role === 'Finance Manager';
  const pendingTransactions = auditLogs.filter((l) => l.status === 'PENDING');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        simulatorOpen={simulatorOpen}
        setSimulatorOpen={setSimulatorOpen}
        onOpenStaffManagement={() => setIsStaffManagementOpen(true)}
        onOpenSupabase={() => setIsSupabaseOpen(true)}
      />

      {/* Environment / ABAC Parameter Simulator Drawer (Only accessible & configurable by Finance Manager) */}
      <EnvironmentSimulator
        context={securityContext}
        setContext={setSecurityContext}
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        userRole={currentUser.role}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Floating Notification / Feedback Toast */}
        {notification && (
          <div
            className={`p-4 rounded-2xl border shadow-sm flex items-start justify-between gap-3 transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-blue-50 border-blue-300 text-blue-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {notification.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {notification.type === 'error' && (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              {notification.type === 'info' && (
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-bold">{notification.title}</h4>
                <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                  {notification.message}
                </p>
                {notification.logId && (
                  <button
                    onClick={() => setActiveTab('audit_logs')}
                    className="mt-2 text-xs font-bold underline underline-offset-2 flex items-center gap-1 hover:opacity-80 cursor-pointer"
                  >
                    <span>Buka Log Audit Keamanan ({notification.logId})</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => setNotification(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100 p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: Transaction & Live Policy Inspector */}
        {activeTab === 'transaction' && (
          <div className="space-y-8">
            {/* If Manager and there are pending submissions: Escalation Approval Banner */}
            {isManager && pendingTransactions.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-700" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Antrean Pengajuan Menunggu Keputusan Manager ({pendingTransactions.length} Pengajuan PENDING)
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Finance Staff mengajukan transaksi di atas batas wewenang mandirinya (Rp50.000.000). Sebagai Finance Manager, Anda berhak menyetujui atau menolak.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('audit_logs')}
                    className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Buka Semua di Audit Log</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {pendingTransactions.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-white border border-amber-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {item.referenceNo}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs font-semibold text-slate-700">
                            Diajukan oleh: <strong>{item.actor.fullName}</strong> ({item.actor.role})
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          Penerima: <strong>{item.transaction.recipientName}</strong> ({item.transaction.bankName} - {item.transaction.recipientAccount})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Keperluan: {item.transaction.description}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Nominal Pengajuan:</span>
                          <span className="text-base font-mono font-bold text-blue-600">
                            {formatIDR(item.transaction.amount)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprovePending(item.id)}
                            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Setujui (Potong Saldo)</span>
                          </button>
                          <button
                            onClick={() => handleDenyPending(item.id)}
                            className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1. Transaction Form on Top (Full Width, with dynamic balance) */}
            <div className="w-full">
              <TransactionForm
                currentUser={currentUser}
                transaction={transaction}
                setTransaction={setTransaction}
                onSubmitTransaction={handleSubmitTransaction}
                isSubmitting={isSubmitting}
                corporateBalance={corporateBalance}
                onOpenTopUp={() => setIsTopUpOpen(true)}
              />
            </div>

            {/* 2. Live Access Control Policy Inspector Directly Below (Full Width, Spacious) */}
            <div className="w-full">
              <PolicyInspector
                currentUser={currentUser}
                context={securityContext}
                transaction={transaction}
              />
            </div>

            {/* 3. Recent Security Audit Log Preview Strip at bottom */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                    Aktivitas Audit Keamanan Terkini
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('audit_logs')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Buka Seluruh Log ({auditLogs.length})</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {auditLogs.length === 0 ? (
                <div className="py-6 px-4 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 space-y-1.5">
                  <ShieldCheck className="w-7 h-7 text-blue-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Log Audit Masih Bersih (Kosong)</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Data dummy telah dihilangkan. Transaksi yang Anda kirim melalui form di atas akan muncul di sini secara berurutan dan otomatis disinkronkan ke Supabase.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {auditLogs.slice(0, 4).map((log) => (
                    <div
                      key={log.id}
                      className="py-3 flex items-center justify-between text-xs gap-3 flex-wrap hover:bg-slate-50 px-2 rounded-lg transition-colors cursor-pointer"
                      onClick={() => setActiveTab('audit_logs')}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            log.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : log.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-900 border border-amber-300'
                              : 'bg-rose-50 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {log.status === 'PENDING' ? 'PENDING (MANAGER)' : log.status}
                        </span>
                        <span className="font-mono text-slate-500 text-xs font-bold">
                          {log.referenceNo}
                        </span>
                        <span className="text-slate-800 font-bold truncate max-w-[200px]">
                          {log.transaction.recipientName}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-mono text-blue-600 font-bold tabular-nums">
                          {formatIDR(log.transaction.amount)}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                          {log.timestamp}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Security Audit Logs */}
        {activeTab === 'audit_logs' && (
          <AuditLogViewer
            logs={auditLogs}
            onResetLogs={() => setAuditLogs([])}
            onClearLogs={() => setAuditLogs([])}
            onLoadSampleLogs={() => setAuditLogs(SAMPLE_AUDIT_LOGS)}
            onGoToTransaction={() => setActiveTab('transaction')}
            currentUserRole={currentUser.role}
            onApprovePending={handleApprovePending}
            onDenyPending={handleDenyPending}
          />
        )}

        {/* Tab 3: RBAC vs ABAC Architecture Specs */}
        {activeTab === 'architecture' && <ArchitectureDrawer />}
      </main>

      {/* MFA Modal (Triggered for amounts > Rp 10.000.000) */}
      <MfaModal
        isOpen={isMfaOpen}
        transaction={transaction}
        onSuccess={handleMfaSuccess}
        onCancel={handleMfaCancel}
      />

      {/* Staff Management Modal for Finance Manager */}
      <StaffManagementModal
        isOpen={isStaffManagementOpen}
        onClose={() => setIsStaffManagementOpen(false)}
        users={users}
        onAddStaff={handleAddStaff}
        onDeleteStaff={handleDeleteStaff}
      />

      {/* Cash Balance Top Up Modal for Finance Manager */}
      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        currentBalance={corporateBalance}
        onTopUpSuccess={handleTopUpSuccess}
      />

      {/* Supabase Connection & Live Sync Modal */}
      <SupabaseModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
        syncCount={supabaseSyncCount}
        auditLogs={auditLogs}
        users={users}
        onSyncCompleted={(cnt) => setSupabaseSyncCount((prev) => prev + cnt)}
      />
    </div>
  );
}
