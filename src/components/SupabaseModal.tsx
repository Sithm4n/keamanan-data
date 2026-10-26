import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  X,
  UploadCloud,
  AlertTriangle,
  Table,
  Download,
  HelpCircle,
} from 'lucide-react';
import {
  SUPABASE_PROJECT_REF,
  SUPABASE_URL,
  testSupabaseConnection,
  syncAllLogsToSupabase,
  seedUsersToSupabase,
  SupabaseSyncResult,
  getSupabaseConfig,
  saveSupabaseConfig,
  resetSupabaseConfig,
  DEFAULT_PROJECT_REF,
  DEFAULT_SUPABASE_URL,
  DEFAULT_ANON_KEY,
} from '../lib/supabase';
import { AuditLogEntry, UserProfile } from '../types/security';
import { KeyRound, Settings, Info, ArrowRight, Users } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncCount: number;
  auditLogs: AuditLogEntry[];
  users?: UserProfile[];
  onSyncCompleted: (syncedCount: number) => void;
}

const SUPABASE_FIX_SQL = `-- ============================================================================
-- SKEMA TABEL & KEAMANAN RLS AWANPAY (KHUSUS SUPABASE POSTGRESQL)
-- CATATAN: Di Supabase TIDAK PERLU 'CREATE DATABASE' atau 'USE awanpay_corp'
-- karena database 'postgres' dan skema 'public' sudah aktif secara otomatis.
-- Proyek: fefckqapttnkgwwvwyyv
-- ============================================================================

-- 1. BUAT / PASTIKAN TABEL TRANSAKSI TERSEDIA
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_no TEXT UNIQUE NOT NULL,
    actor_username TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_account TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    department TEXT NOT NULL,
    description TEXT,
    status TEXT CHECK (status IN ('APPROVED', 'DENIED', 'PENDING')) DEFAULT 'PENDING',
    mfa_status TEXT NOT NULL,
    mfa_method TEXT,
    client_ip TEXT NOT NULL,
    primary_reason TEXT,
    detailed_violations TEXT[],
    escalated_to_manager BOOLEAN DEFAULT FALSE,
    manager_decided_by TEXT,
    manager_decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. BERSIHKAN POLICY LAMA AGAR TIDAK KONFLIK ATAU MEMBLOKIR INSERT
DROP POLICY IF EXISTS "Enable read access for all users" ON public.transactions;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.transactions;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.transactions;
DROP POLICY IF EXISTS "Allow All Read" ON public.transactions;
DROP POLICY IF EXISTS "Allow All Insert" ON public.transactions;
DROP POLICY IF EXISTS "Allow All Update" ON public.transactions;
DROP POLICY IF EXISTS "Allow Select Transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow Insert Transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow Update Decisions" ON public.transactions;
DROP POLICY IF EXISTS "ABAC Staff Disbursement Policy" ON public.transactions;
DROP POLICY IF EXISTS "ABAC Manager Full Approval Policy" ON public.transactions;

-- 4. BUAT POLICY BARU: IZINKAN WEB DEMO MEMBACA, MENAMBAH & MENGUPDATE TRANSAKSI
CREATE POLICY "Enable read access for all users"
ON public.transactions FOR SELECT
USING (true);

CREATE POLICY "Enable insert access for all users"
ON public.transactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable update access for all users"
ON public.transactions FOR UPDATE
USING (true);
`;

const SUPABASE_TRANSACTIONS_SQL = SUPABASE_FIX_SQL;

const SUPABASE_USERS_SQL = `-- ============================================================================
-- 1. TABEL AKUN PENGGUNA TERDAFTAR (AWANPAY USER ACCOUNTS)
-- Jalankan skrip ini di SQL Editor Supabase:
-- https://supabase.com/dashboard/project/fefckqapttnkgwwvwyyv/sql
-- ============================================================================

-- BUAT TABEL USERS JIKA BELUM ADA
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Finance Staff', 'Finance Manager')),
    employee_id TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    password TEXT NOT NULL DEFAULT 'staff123',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- BERSIHKAN KEBIJAKAN LAMA JIKA ADA
DROP POLICY IF EXISTS "Allow anon read all users" ON public.users;
DROP POLICY IF EXISTS "Allow anon insert users" ON public.users;
DROP POLICY IF EXISTS "Allow anon update users" ON public.users;
DROP POLICY IF EXISTS "Allow anon delete users" ON public.users;

-- BUAT KEBIJAKAN RLS AGAR APLIKASI WEB DAPAT MEMBACA & MENGELOLA AKUN
CREATE POLICY "Allow anon read all users"
    ON public.users FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow anon insert users"
    ON public.users FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow anon update users"
    ON public.users FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon delete users"
    ON public.users FOR DELETE
    TO anon, authenticated
    USING (true);

-- INSERT / SEED AKUN AWAL (NAJA & NAJWA)
INSERT INTO public.users (id, username, full_name, email, role, employee_id, department, password)
VALUES 
    ('usr_staff_01', 'naja', 'Naja', 'naja@awanpay.corp', 'Finance Staff', 'AWN-STF-001', 'Treasury & Disbursement Operations', 'staff123'),
    ('usr_manager_01', 'najwa', 'Najwa', 'najwa@awanpay.corp', 'Finance Manager', 'AWN-MGR-001', 'Corporate Finance & Risk Control', 'manager123')
ON CONFLICT (username) DO UPDATE 
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    employee_id = EXCLUDED.employee_id,
    password = EXCLUDED.password,
    updated_at = NOW();
`;

const SUPABASE_COMBINED_SQL = `-- ============================================================================
-- SKEMA LENGKAP POSTGRESQL AWANPAY (TABEL USERS & TABEL TRANSACTIONS)
-- Jalankan skrip ini sekaligus di SQL Editor Supabase!
-- Proyek: fefckqapttnkgwwvwyyv
-- ============================================================================

${SUPABASE_USERS_SQL}

-- ============================================================================
-- 2. TABEL TRANSAKSI & LOG AUDIT KEAMANAN
-- ============================================================================
${SUPABASE_TRANSACTIONS_SQL}
`;

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  syncCount,
  auditLogs,
  users = [],
  onSyncCompleted,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SupabaseSyncResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeSqlTab, setActiveSqlTab] = useState<'users' | 'transactions' | 'all'>('users');
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [bulkSyncResult, setBulkSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [usersSyncResult, setUsersSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Dynamic configuration state
  const currentCfg = getSupabaseConfig();
  const [customUrl, setCustomUrl] = useState(currentCfg.url);
  const [customKey, setCustomKey] = useState(currentCfg.key);
  const [showConfig, setShowConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    setTesting(true);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setTesting(false);
  };

  const handleSaveConfig = () => {
    saveSupabaseConfig(customUrl, customKey);
    setConfigFeedback('Pengaturan Supabase berhasil disimpan!');
    setTimeout(() => setConfigFeedback(null), 3000);
    handleTestConnection();
  };

  const handleResetConfig = () => {
    resetSupabaseConfig();
    setCustomUrl(DEFAULT_SUPABASE_URL);
    setCustomKey(DEFAULT_ANON_KEY);
    setConfigFeedback('Konfigurasi dikembalikan ke nilai awal proyek.');
    setTimeout(() => setConfigFeedback(null), 3000);
    handleTestConnection();
  };

  const handleBulkSync = async () => {
    setIsBulkSyncing(true);
    setBulkSyncResult(null);

    const res = await syncAllLogsToSupabase(auditLogs);
    setBulkSyncResult({
      success: res.success,
      message: res.message,
    });

    if (res.success) {
      onSyncCompleted(res.syncedCount);
      // Re-test connection to update row count
      const updatedStatus = await testSupabaseConnection();
      setTestResult(updatedStatus);
    }

    setIsBulkSyncing(false);
  };

  const getActiveSql = () => {
    if (activeSqlTab === 'users') return SUPABASE_USERS_SQL;
    if (activeSqlTab === 'transactions') return SUPABASE_TRANSACTIONS_SQL;
    return SUPABASE_COMBINED_SQL;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveSql());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncUsers = async () => {
    if (!users || users.length === 0) return;
    setIsSyncingUsers(true);
    setUsersSyncResult(null);

    const res = await seedUsersToSupabase(users);
    setUsersSyncResult({
      success: res.success,
      message: res.message,
    });

    if (res.success) {
      onSyncCompleted(users.length);
      const updatedStatus = await testSupabaseConnection();
      setTestResult(updatedStatus);
    }
    setIsSyncingUsers(false);
  };

  const generatePostgresDump = (): string => {
    let sql = `${SUPABASE_COMBINED_SQL}\n\n-- ============================================================================\n-- DATA AWAL DML TRANSAKSI (${auditLogs.length} REKAMAN)\n-- ============================================================================\n`;
    if (auditLogs.length === 0) {
      sql += `-- Belum ada data transaksi yang tercatat di web demo.\n`;
      return sql;
    }

    auditLogs.forEach((log) => {
      const esc = (val: string | null | undefined) => (val ? `'${val.replace(/'/g, "''")}'` : 'NULL');
      const escArr = (arr: string[] | undefined) => {
        if (!arr || arr.length === 0) return 'ARRAY[]::TEXT[]';
        return `ARRAY[${arr.map((a) => `'${a.replace(/'/g, "''")}'`).join(', ')}]`;
      };

      sql += `INSERT INTO public.transactions (
    reference_no, actor_username, actor_name, actor_role,
    recipient_name, recipient_account, bank_name, amount,
    department, description, status, mfa_status, mfa_method,
    client_ip, primary_reason, detailed_violations,
    escalated_to_manager, manager_decided_by, manager_decided_at, created_at
) VALUES (
    ${esc(log.referenceNo)}, ${esc(log.actor.username)}, ${esc(log.actor.fullName)}, ${esc(log.actor.role)},
    ${esc(log.transaction.recipientName)}, ${esc(log.transaction.recipientAccount)}, ${esc(log.transaction.bankName)}, ${log.transaction.amount},
    ${esc(log.transaction.department)}, ${esc(log.transaction.description)}, ${esc(log.status)}, ${esc(log.mfaStatus)}, ${esc(log.mfaMethod)},
    ${esc(log.contextSnapshot.ip)}, ${esc(log.primaryReason)}, ${escArr(log.detailedViolations)},
    ${log.escalatedToManager ? 'TRUE' : 'FALSE'}, ${esc(log.managerDecision?.decidedBy)}, ${log.managerDecision ? 'NOW()' : 'NULL'}, NOW()
) ON CONFLICT (reference_no) DO NOTHING;\n\n`;
    });
    return sql;
  };

  const handleDownloadPostgresDump = () => {
    const content = generatePostgresDump();
    const blob = new Blob([content], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `awanpay_postgresql_dump_${new Date().toISOString().slice(0, 10)}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateMysqlDump = (): string => {
    let sql = `-- ============================================================================
-- AWANPAY MYSQL DUMP - UNIVERSITAS / TUGAS DOSEN AKHMAD ZAINI
-- Import berkas ini ke phpMyAdmin atau MySQL Workbench
-- ============================================================================
CREATE DATABASE IF NOT EXISTS awanpay_corp;
USE awanpay_corp;

-- 1. TABEL AKUN PENGGUNA TERDAFTAR (USERS)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('Finance Staff', 'Finance Manager') NOT NULL,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL DEFAULT 'staff123',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DATA AKUN AWAL
INSERT IGNORE INTO users (id, username, full_name, email, role, employee_id, department, password)
VALUES 
    ('usr_staff_01', 'naja', 'Naja', 'naja@awanpay.corp', 'Finance Staff', 'AWN-STF-001', 'Treasury & Disbursement Operations', 'staff123'),
    ('usr_manager_01', 'najwa', 'Najwa', 'najwa@awanpay.corp', 'Finance Manager', 'AWN-MGR-001', 'Corporate Finance & Risk Control', 'manager123');

-- 2. TABEL TRANSAKSI & LOG AUDIT KEAMANAN
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference_no VARCHAR(50) UNIQUE NOT NULL,
    actor_username VARCHAR(50) NOT NULL,
    actor_name VARCHAR(100) NOT NULL,
    actor_role ENUM('Finance Staff', 'Finance Manager') NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_account VARCHAR(50) NOT NULL,
    bank_name VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    department VARCHAR(50) NOT NULL,
    description TEXT,
    status ENUM('APPROVED', 'DENIED', 'PENDING') DEFAULT 'PENDING',
    mfa_status VARCHAR(50) NOT NULL,
    client_ip VARCHAR(45) NOT NULL,
    primary_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INSERT DATA TRANSAKSI
`;
    auditLogs.forEach((log) => {
      const esc = (val: string | null | undefined) => (val ? `'${val.replace(/'/g, "''")}'` : 'NULL');
      sql += `INSERT IGNORE INTO transactions (reference_no, actor_username, actor_name, actor_role, recipient_name, recipient_account, bank_name, amount, department, description, status, mfa_status, client_ip, primary_reason)
VALUES (${esc(log.referenceNo)}, ${esc(log.actor.username)}, ${esc(log.actor.fullName)}, ${esc(log.actor.role)}, ${esc(log.transaction.recipientName)}, ${esc(log.transaction.recipientAccount)}, ${esc(log.transaction.bankName)}, ${log.transaction.amount}, ${esc(log.transaction.department)}, ${esc(log.transaction.description)}, ${esc(log.status)}, ${esc(log.mfaStatus)}, ${esc(log.contextSnapshot.ip)}, ${esc(log.primaryReason)});\n`;
    });
    return sql;
  };

  const handleDownloadMysqlDump = () => {
    const content = generateMysqlDump();
    const blob = new Blob([content], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `awanpay_mysql_dump_${new Date().toISOString().slice(0, 10)}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Integrasi & Sinkronisasi Supabase
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono truncate max-w-md">
                {customUrl}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Active Connection Banner */}
          {testResult?.success ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-2.5 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                    <span>Koneksi Supabase Aktif &amp; Terhubung!</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-[10px] font-mono font-bold">
                      HTTP 200 OK
                    </span>
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                    Proyek: {SUPABASE_PROJECT_REF}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    testResult.usersTableExists
                      ? 'bg-white border-emerald-300 text-emerald-900 shadow-2xs'
                      : 'bg-amber-50/80 border-amber-300 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <div>
                        <span className="font-bold block text-xs">public.users</span>
                        <span className="text-[10px] text-slate-500">Tabel Akun Pengguna</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      testResult.usersTableExists
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {testResult.usersTableExists ? `${testResult.usersRowCount ?? 0} Akun Aktif` : 'Belum Dibuat'}
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    testResult.tableExists
                      ? 'bg-white border-emerald-300 text-emerald-900 shadow-2xs'
                      : 'bg-amber-50/80 border-amber-300 text-amber-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-emerald-600" />
                      <div>
                        <span className="font-bold block text-xs">public.transactions</span>
                        <span className="text-[10px] text-slate-500">Tabel Transaksi &amp; Log</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      testResult.tableExists
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {testResult.tableExists ? `${testResult.rowCount ?? 0} Transaksi` : 'Belum Dibuat'}
                    </span>
                  </div>
                </div>

                {!testResult.usersTableExists && (
                  <div className="text-[11px] bg-amber-100/70 border border-amber-300 text-amber-900 p-2.5 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      Tabel <code>public.users</code> belum dibuat di Supabase. Silakan pilih tab <strong>&quot;1. Tabel Akun (public.users)&quot;</strong> di bagian skrip SQL di bawah, salin, dan jalankan di SQL Editor Supabase Anda.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Recovery Alert if not connected */
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-indigo-950">
                    Panduan Koneksi &amp; Pemulihan Proyek Supabase
                  </h4>
                  
                  <div className="space-y-2 text-[11px] text-indigo-900 leading-relaxed">
                    <div className="p-2.5 bg-white/90 rounded-xl border border-indigo-200">
                      <span className="font-bold text-indigo-950 block mb-1">
                        Cek Dropdown Organisasi di Dashboard
                      </span>
                      <p className="text-slate-700">
                        Buka <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline">supabase.com/dashboard</a>. Pastikan nama organisasi di pojok kiri atas adalah <strong>&quot;Keamanan data&quot;</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Backup SQL Dump Downloads for University Assignment */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-mono font-bold">
                  Cadangan Berkas SQL (Untuk Tugas Dosen Pak Akhmad Zaini)
                </span>
                <span className="font-bold text-slate-900 text-xs">
                  Unduh Berkas Dump SQL Lengkap (Skema + Data Transaksi)
                </span>
              </div>
              <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {auditLogs.length} Transaksi Siap
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Jika ada kendala koneksi internet atau diminta mengumpulkan file SQL secara fisik oleh dosen, Anda dapat mengunduh berkas SQL ini kapan saja:
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadPostgresDump}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh PostgreSQL Dump (.sql)</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadMysqlDump}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh MySQL / phpMyAdmin Dump (.sql)</span>
              </button>
            </div>
          </div>


          {/* Explanation Alert for Image 1 (MySQL vs PostgreSQL) */}
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">
                  Catatan untuk Dosen (Pak Akhmad Zaini): MySQL vs Supabase (PostgreSQL)
                </h4>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  Supabase adalah <strong>PostgreSQL</strong> (mendukung Row-Level Security / RLS). Untuk tugas MySQL murni, gunakan tab <em>&quot;Spesifikasi RBAC vs ABAC&quot;</em> dan import skrip MySQL ke <strong>phpMyAdmin / MySQL Workbench</strong>. Untuk demo Cloud Database, gunakan skrip PostgreSQL di bawah ini.
                </p>
              </div>
            </div>
          </div>

          {/* Connection Overview & Action Buttons */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono font-bold">
                  Status Database Supabase
                </span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {testResult?.tableExists
                    ? `Tabel public.transactions (${testResult.rowCount ?? 0} baris data)`
                    : 'Menunggu inisialisasi / pengecekan'}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Memeriksa...' : 'Cek Status'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Pengaturan URL</span>
                </button>

                <a
                  href={`https://supabase.com/dashboard/project/${DEFAULT_PROJECT_REF}/editor`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>SQL Editor</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href={`https://supabase.com/dashboard/project/${DEFAULT_PROJECT_REF}/editor`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-blue-700 hover:bg-blue-50 font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Table Editor</span>
                </a>
              </div>
            </div>

            {/* Config Box Drawer */}
            {showConfig && (
              <div className="p-4 bg-white rounded-xl border border-slate-300 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    <span>Konfigurasi Endpoint Supabase</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Tersimpan di browser lokal
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Supabase Project URL:
                    </label>
                    <input
                      type="text"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://your-ref.supabase.co"
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Anon Public Key:
                    </label>
                    <textarea
                      rows={2}
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      placeholder="eyJhbGciOi..."
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:border-blue-500 resize-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      *Catatan Keamanan: Jangan gunakan <code>service_role</code> (secret) pada aplikasi front-end browser. Gunakan selalu <code>anon public key</code>.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleResetConfig}
                      className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium cursor-pointer"
                    >
                      Kembalikan ke Default
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                    >
                      Simpan & Uji Koneksi
                    </button>
                  </div>

                  {configFeedback && (
                    <div className="p-2 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-medium text-center">
                      {configFeedback}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Test Status Indicator */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">
                    {testResult.success ? 'Terkoneksi ke Supabase' : 'Koneksi Ditolak / Gagal'}
                  </div>
                  <div className="text-[11px] opacity-90 mt-0.5">
                    {testResult.message}
                  </div>
                </div>
              </div>
            )}

            {/* User Account Sync Card */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Sinkronkan Akun Terdaftar ke public.users:</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {users.length} akun terdaftar di aplikasi (Naja, Najwa, dll) dapat dikirimkan ke tabel Supabase.
                </div>
              </div>

              <button
                type="button"
                onClick={handleSyncUsers}
                disabled={isSyncingUsers}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 text-xs shrink-0"
              >
                <UploadCloud className={`w-4 h-4 ${isSyncingUsers ? 'animate-bounce' : ''}`} />
                <span>{isSyncingUsers ? 'Menyinkronkan...' : 'Sinkronkan Akun ke Supabase'}</span>
              </button>
            </div>

            {usersSyncResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium ${
                  usersSyncResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {usersSyncResult.message}
              </div>
            )}

            {/* Bulk Push Button to send web data into Supabase */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Table className="w-4 h-4 text-emerald-600" />
                  <span>Kirim Data Transaksi Demo ke Supabase:</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {auditLogs.length} rekaman transaksi di web siap dikirimkan ke tabel Supabase.
                </div>
              </div>

              <button
                type="button"
                onClick={handleBulkSync}
                disabled={isBulkSyncing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 text-xs shrink-0"
              >
                <UploadCloud className={`w-4 h-4 ${isBulkSyncing ? 'animate-bounce' : ''}`} />
                <span>{isBulkSyncing ? 'Mengirim Data...' : 'Kirim Semua Data ke Supabase'}</span>
              </button>
            </div>

            {bulkSyncResult && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium ${
                  bulkSyncResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {bulkSyncResult.message}
              </div>
            )}
          </div>

          {/* SQL Script to Run in Supabase SQL Editor */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wide">
                  Skrip SQL Supabase (PostgreSQL)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Pilih skrip yang ingin Anda jalankan di SQL Editor Supabase:
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://supabase.com/dashboard/project/${DEFAULT_PROJECT_REF}/sql/new`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
                >
                  <span>Buka SQL Editor</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs text-xs shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Skrip Tersalin!' : 'Salin Skrip Pilihan'}</span>
                </button>
              </div>
            </div>

            {/* SQL Tab Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveSqlTab('users')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeSqlTab === 'users'
                    ? 'bg-white text-blue-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>1. Tabel Akun (public.users)</span>
                {!testResult?.usersTableExists && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveSqlTab('transactions')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeSqlTab === 'transactions'
                    ? 'bg-white text-emerald-700 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>2. Tabel Transaksi (public.transactions)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSqlTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeSqlTab === 'all'
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>3. Skrip Lengkap (Semua Tabel)</span>
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-60 border border-slate-800">
                {getActiveSql()}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Setiap transaksi baru atau persetujuan Manager otomatis tersimpan ke Supabase.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
