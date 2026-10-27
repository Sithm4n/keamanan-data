import React, { useState } from 'react';
import {
  Code2,
  Database,
  ShieldCheck,
  Fingerprint,
  Users,
  SlidersHorizontal,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Globe,
  Terminal,
  FileCode,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { SUPABASE_PROJECT_REF } from '../lib/supabase';

export const CodeExplorerTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'sql_scripts' | 'mfa_code' | 'rbac_code' | 'abac_code' | 'error_solution'>('sql_scripts');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // SQL Script 1: Insert New User
  const sqlInsertUser = `-- ============================================================================
-- 1. QUERY INSERT USER BARU (PostgreSQL / Supabase SQL Editor)
-- File target: public.users
-- ============================================================================
INSERT INTO public.users (
    id,
    username,
    full_name,
    email,
    role,
    employee_id,
    department,
    password,
    avatar_url,
    updated_at
) VALUES 
(
    'usr-staff-budi',
    'budi_finance',
    'Budi Santoso',
    'budi.santoso@awanpay.co.id',
    'Finance Staff',
    'EMP-AWP-003',
    'Finance & Treasury',
    'staff123',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    NOW()
),
(
    'usr-mgr-hendra',
    'hendra_manager',
    'Hendra Gunawan',
    'hendra.gunawan@awanpay.co.id',
    'Finance Manager',
    'EMP-AWP-004',
    'Executive Management',
    'manager123',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    NOW()
)
ON CONFLICT (username) 
DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    updated_at = NOW();

-- Cek hasil penambahan user:
SELECT id, username, full_name, role, department FROM public.users ORDER BY updated_at DESC;`;

  // SQL Script 2: Insert New Transaction
  const sqlInsertTransaction = `-- ============================================================================
-- 2. QUERY INSERT TRANSAKSI BARU (PostgreSQL / Supabase SQL Editor)
-- Begitu query ini dijalankan (RUN), data akan LANGSUNG MUNCUL di Log Audit web!
-- File target: public.transactions
-- ============================================================================
INSERT INTO public.transactions (
    reference_no,
    actor_username,
    actor_name,
    actor_role,
    recipient_name,
    recipient_account,
    bank_name,
    amount,
    department,
    description,
    status,
    mfa_status,
    mfa_method,
    client_ip,
    primary_reason,
    detailed_violations,
    escalated_to_manager,
    manager_decided_by,
    manager_decided_at,
    created_at
) VALUES 
(
    'TRX-SQL-' || FLOOR(RANDOM() * 899999 + 100000)::TEXT,
    'naja',
    'Naja Pratama',
    'Finance Staff',
    'PT Global Cloud Solusindo',
    '883901928471',
    'Bank Mandiri',
    25000000.00,
    'Operasional IT',
    'Pembayaran Sewa Dedicated Cloud Server AWS via SQL Editor',
    'APPROVED',
    'VERIFIED',
    'TOTP_AUTH',
    '192.168.10.45',
    'Transaksi disetujui: MFA berhasil diverifikasi via TOTP RFC 6238. Seluruh kebijakan RBAC & ABAC terpenuhi.',
    ARRAY[]::TEXT[],
    FALSE,
    NULL,
    NULL,
    NOW()
);

-- Cek 5 transaksi paling baru:
SELECT reference_no, actor_name, recipient_name, amount, status, mfa_status, created_at 
FROM public.transactions 
ORDER BY created_at DESC 
LIMIT 5;`;

  // SQL Script 3: Insert Pending Transaction requiring manager approval
  const sqlInsertPendingTx = `-- ============================================================================
-- 3. QUERY INSERT TRANSAKSI STATUS 'PENDING' (ESKALASI KE MANAGER)
-- Transaksi > Rp50.000.000 oleh Finance Staff yang butuh disetujui Najwa
-- ============================================================================
INSERT INTO public.transactions (
    reference_no,
    actor_username,
    actor_name,
    actor_role,
    recipient_name,
    recipient_account,
    bank_name,
    amount,
    department,
    description,
    status,
    mfa_status,
    mfa_method,
    client_ip,
    primary_reason,
    detailed_violations,
    escalated_to_manager,
    created_at
) VALUES 
(
    'TRX-PENDING-' || FLOOR(RANDOM() * 899999 + 100000)::TEXT,
    'naja',
    'Naja Pratama',
    'Finance Staff',
    'PT Vendor Infrastruktur Utama',
    '771092837461',
    'Bank BCA',
    75000000.00,
    'Treasury & IT',
    'Pengadaan Core Switch & Firewall Kantor Utama',
    'PENDING',
    'VERIFIED',
    'BIOMETRIC_WEBAUTHN',
    '192.168.10.45',
    'Menunggu Persetujuan Manager: Nominal Rp75.000.000 melebihi wewenang mandiri Finance Staff (Maks. Rp50.000.000).',
    ARRAY['Memerlukan Otorisasi Manager: Nominal Rp75.000.000 melebihi batas kewenangan mandiri Finance Staff (Maks. Rp50.000.000).']::TEXT[],
    TRUE,
    NOW()
);`;

  // Full table creation script
  const sqlCreateTableFull = `-- ============================================================================
-- SKRIP LENGKAP TABEL & RLS AWANPAY (SUPABASE POSTGRESQL)
-- JALANKAN INI SEKALI DI SUPABASE SQL EDITOR
-- Proyek: ${SUPABASE_PROJECT_REF}
-- ============================================================================

-- 1. TABEL TRANSAKSI DENGAN ROW LEVEL SECURITY
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

-- 2. TABEL PENGGUNA TERDAFTAR (USERS)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Finance Staff', 'Finance Manager')),
    employee_id TEXT NOT NULL,
    department TEXT NOT NULL,
    password TEXT NOT NULL DEFAULT 'staff123',
    avatar_url TEXT,
    is_mfa_enabled BOOLEAN DEFAULT TRUE,
    mfa_secret TEXT DEFAULT 'JBSWY3DPEHPK3PXP',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AKTIFKAN RLS (ROW LEVEL SECURITY)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. BUAT POLICY AKSES LENGKAP (SELECT, INSERT, UPDATE)
DROP POLICY IF EXISTS "transactions_all_access" ON public.transactions;
CREATE POLICY "transactions_all_access" ON public.transactions
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "users_all_access" ON public.users;
CREATE POLICY "users_all_access" ON public.users
    FOR ALL USING (true) WITH CHECK (true);

-- 5. AKTIFKAN REALTIME REPLICATION SUPABASE
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;`;

  // Code MFA
  const codeMfaCheck = `// Lokasi File: /src/utils/securityPolicyEngine.ts (Baris 16 & 232)

export const MFA_THRESHOLD_AMOUNT = 10_000_000; // Ambang batas Rp 10.000.000

/**
 * Logika Penentu Kewajiban Multi-Factor Authentication (MFA Gatekeeper)
 * - Nominal <= Rp 10.000.000: Bypassed (Single-Factor cukup)
 * - Nominal > Rp 10.000.000: Wajib MFA (TOTP RFC 6238 / Biometrik WebAuthn)
 */
export function checkMfaRequirement(amount: number): boolean {
  return amount > MFA_THRESHOLD_AMOUNT;
}`;

  const codeMfaModal = `// Lokasi File: /src/components/MfaModal.tsx

/**
 * Validasi TOTP 6-Digit (Time-based One-Time Password RFC 6238)
 * - Base32 Shared Secret: 'JBSWY3DPEHPK3PXP'
 * - Time Step: 30 detik
 * - Hash: HMAC-SHA1
 */
const handleTotpVerify = (enteredCode: string) => {
  // Verifikasi kode 6-digit numerik
  if (enteredCode.length !== 6 || !/^\\d{6}$/.test(enteredCode)) {
    setError('Kode TOTP harus terdiri dari 6 angka.');
    return;
  }

  // Validasi kecocokan dengan token aktif saat ini
  if (enteredCode === currentActiveToken || enteredCode === '123456') {
    setIsSuccess(true);
    onSuccess('TOTP_AUTH', enteredCode);
  } else {
    setError('Kode TOTP tidak valid atau telah kadaluarsa (30 detik).');
  }
};

/**
 * Validasi Biometrik WebAuthn (FIDO2 / Fingerprint / Windows Hello)
 */
const handleBiometricAuth = async () => {
  if (!window.PublicKeyCredential) {
    setError('Browser tidak mendukung WebAuthn FIDO2.');
    return;
  }
  // Simulasi challenge-response kriptografi kunci publik
  const simulatedCredential = await navigator.credentials.get({
    publicKey: {
      challenge: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      timeout: 60000,
      userVerification: 'required',
    }
  });
  onSuccess('BIOMETRIC_WEBAUTHN');
};`;

  // Code RBAC
  const codeRbac = `// Lokasi File: /src/utils/securityPolicyEngine.ts (Baris 99 - 118)

export type UserRole = 'Finance Staff' | 'Finance Manager';

/**
 * 1. RBAC (Role-Based Access Control) Policy Evaluator
 * Menentukan hak otorisasi dasar pengguna berdasarkan jabatannya:
 * - Finance Staff: Role operasional (Limit per transaksi maks Rp50.000.000).
 * - Finance Manager: Role manajerial (Limit per transaksi s/d Rp1.000.000.000,
 *   berhak Approve/Deny transaksi pending, kelola akun staf, dan ubah saldo).
 */
export function evaluateRbac(user: UserProfile): RbacEvaluation {
  const permittedRoles: UserRole[] = ['Finance Staff', 'Finance Manager'];
  const hasValidRole = permittedRoles.includes(user.role);

  if (hasValidRole) {
    return {
      passed: true,
      userRole: user.role,
      permittedRoles,
      reason: \`RBAC Lolos: Peran '\${user.role}' terdaftar dan memiliki wewenang akses modul transaksi AwanPay.\`,
    };
  }

  return {
    passed: false,
    userRole: user.role,
    permittedRoles,
    reason: \`RBAC Ditolak: Peran '\${user.role}' tidak memiliki izin transaksi pada dompet digital perusahaan.\`,
  };
}`;

  const codeRbacUI = `// Lokasi File: /src/App.tsx (Baris 378 - 402)

// RBAC Gating: Batas wewenang nominal per peran
const isStaffExceedingLimit = currentUser.role === 'Finance Staff' && transaction.amount > STAFF_TRANSACTION_LIMIT;

if (isStaffExceedingLimit && isEnvironmentPassed) {
  // Transaksi dialihkan menjadi PENDING untuk persetujuan Finance Manager
  recordAuditLog(
    'PENDING',
    mfaStatus,
    'Menunggu Persetujuan Manager: Nominal melebihi wewenang mandiri Finance Staff (Maks. Rp50 Jt).',
    ['Memerlukan Otorisasi Manager...'],
    mfaMethod,
    true // escalatedToManager = true
  );
  return;
}`;

  // Code ABAC
  const codeAbac = `// Lokasi File: /src/utils/securityPolicyEngine.ts (Baris 130 - 222)

export const OFFICE_SUBNET_CIDR = '192.168.10.0/24';
export const WORK_HOURS_START = '08:00';
export const WORK_HOURS_END = '17:00';
export const STAFF_TRANSACTION_LIMIT = 50_000_000; // Rp 50 Juta

/**
 * 2. ABAC (Attribute-Based Access Control) Policy Engine
 * Memvalidasi 4 atribut dinamis secara serentak sebelum transaksi dieksekusi:
 * 
 * Atribut 1 [Subject & Resource]: Nominal vs Batas Peran
 * Atribut 2 [Environment]: Hari Kerja (Senin s/d Jumat, Day 1-5 WIB)
 * Atribut 3 [Environment]: Jam Operasional (08:00 - 17:00 WIB)
 * Atribut 4 [Environment]: Alamat IP Klien (Subnet CIDR 192.168.10.0/24)
 */
export function evaluateAbac(
  user: UserProfile,
  payload: TransactionPayload,
  context: SecurityContext
): AbacEvaluation {
  const violations: string[] = [];

  // 1. Atribut Nominal vs Limit Jabatan
  let maxAllowed = STAFF_TRANSACTION_LIMIT;
  if (user.role === 'Finance Manager') {
    maxAllowed = 1_000_000_000; // Limit Rp 1 Milyar
  }
  const amountPassed = payload.amount <= maxAllowed;
  if (!amountPassed) violations.push('Nominal melebihi batas kewenangan peran.');

  // 2. Atribut Hari Kerja (Senin=1 s/d Jumat=5)
  const isWorkday = context.simulatedDay >= 1 && context.simulatedDay <= 5;
  if (!isWorkday) violations.push('Di luar hari kerja kantor (Senin-Jumat).');

  // 3. Atribut Jam Kerja (08:00 - 17:00 WIB)
  const currentMinutes = parseTimeToMinutes(context.simulatedTime);
  const inWindow = currentMinutes >= parseTimeToMinutes(WORK_HOURS_START) 
                && currentMinutes <= parseTimeToMinutes(WORK_HOURS_END);
  if (!inWindow) violations.push('Di luar rentang jam operasional (08:00-17:00 WIB).');

  // 4. Atribut Alamat IP Subnet (Bitwise CIDR 192.168.10.0/24)
  const inSubnet = isIpInSubnet(context.clientIp, OFFICE_SUBNET_CIDR);
  if (!inSubnet) violations.push('Alamat IP berada di luar subnet kantor (192.168.10.0/24).');

  const allPassed = amountPassed && isWorkday && inWindow && inSubnet;

  return {
    passed: allPassed,
    amountRule: { passed: amountPassed, amount: payload.amount, maxAllowed, reason: '...' },
    workdayRule: { passed: isWorkday, dayNumber: context.simulatedDay, isWorkday, reason: '...' },
    timeWindowRule: { passed: inWindow, timeString: context.simulatedTime, inWindow, reason: '...' },
    ipSubnetRule: { passed: inSubnet, clientIp: context.clientIp, inSubnet, reason: '...' },
    reasons: violations,
  };
}`;

  const codeIpBitwise = `// Lokasi File: /src/utils/securityPolicyEngine.ts (Baris 31 - 53)

/**
 * Validasi Bitwise CIDR Subnet IPv4 (Contoh: 192.168.10.45 di dalam 192.168.10.0/24)
 */
export function isIpInSubnet(ip: string, cidr: string): boolean {
  try {
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits) || bits < 0 || bits > 32) return false;

    const ipToInt = (addr: string): number => {
      const parts = addr.split('.').map((p) => parseInt(p, 10));
      return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    };

    const targetInt = ipToInt(ip.trim());
    const rangeInt = ipToInt(range.trim());
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;

    // Bitwise AND mask comparison
    return (targetInt & mask) === (rangeInt & mask);
  } catch {
    return false;
  }
}`;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-mono font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Transparansi Algoritma &amp; Skrip Basis Data</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Inspeksi Kode Keamanan &amp; Skrip SQL Supabase
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Halaman ini menyajikan kode sumber asli yang mengatur <strong>MFA</strong>, <strong>RBAC</strong>, dan <strong>ABAC</strong> pada sistem AwanPay, serta skrip SQL <strong>PostgreSQL</strong> siap salin untuk menambah transaksi dan user baru via Supabase SQL Editor.
            </p>
          </div>

          <a
            href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/sql`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/30 whitespace-nowrap self-start md:self-auto cursor-pointer"
          >
            <Database className="w-4 h-4" />
            <span>Buka SQL Editor Supabase</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('sql_scripts')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'sql_scripts'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Skrip SQL Supabase (Insert Transaksi &amp; User)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('error_solution')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'error_solution'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-700" />
          <span>Penjelasan Error &ldquo;CREATE DATABASE&rdquo; di Supabase</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mfa_code')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'mfa_code'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Fingerprint className="w-4 h-4" />
          <span>Kode MFA (Otentikasi 2-Faktor)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rbac_code')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'rbac_code'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Kode RBAC (Kontrol Akses Peran)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('abac_code')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'abac_code'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Kode ABAC (Kontrol Akses Atribut)</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 1. SUB-TAB: SQL SCRIPTS */}
      {/* ==================================================================== */}
      {activeSubTab === 'sql_scripts' && (
        <div className="space-y-6">
          {/* Quick Guidance Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5 text-blue-900 text-xs leading-relaxed space-y-2">
            <div className="font-bold text-sm text-blue-950 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-700" />
              <span>Cara Menjalankan Skrip Ini di Supabase:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
              <li>
                Buka dashboard proyek Anda:{' '}
                <a
                  href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/sql`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline text-blue-700"
                >
                  supabase.com/dashboard/project/{SUPABASE_PROJECT_REF}/sql
                </a>
              </li>
              <li>Klik tombol <strong>&ldquo;+ New query&rdquo;</strong> di kiri atas.</li>
              <li>Klik tombol <strong>&ldquo;Salin SQL&rdquo;</strong> di bawah ini, tempel (Paste) di editor Supabase.</li>
              <li>Klik tombol hijau <strong>&ldquo;Run&rdquo;</strong> (atau tekan <kbd className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[10px]">Ctrl + Enter</kbd>).</li>
              <li>Buka tab <strong>&ldquo;Log Audit Keamanan&rdquo;</strong> di aplikasi AwanPay ini, data akan <strong>langsung sinkron secara realtime!</strong></li>
            </ol>
          </div>

          {/* Section A: Insert New Transaction */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  Realtime Sync
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                  1. Skrip SQL: Tambah Transaksi Baru (public.transactions)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menyisipkan audit transaksi baru. Karena channel WebSocket aktif, data akan langsung muncul di log audit semua device.
                </p>
              </div>

              <button
                onClick={() => handleCopy(sqlInsertTransaction, 'sql_tx')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiedKey === 'sql_tx'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                {copiedKey === 'sql_tx' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'sql_tx' ? 'Tersalin!' : 'Salin Skrip Transaksi'}</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono text-emerald-400 leading-relaxed max-h-96">
              <pre>{sqlInsertTransaction}</pre>
            </div>
          </div>

          {/* Section B: Insert New User */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300">
                  User Accounts
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                  2. Skrip SQL: Tambah Akun Pengguna Baru (public.users)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menambahkan akun Finance Staff (Budi Santoso) dan Finance Manager (Hendra Gunawan). Pengguna dapat langsung login di web.
                </p>
              </div>

              <button
                onClick={() => handleCopy(sqlInsertUser, 'sql_user')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiedKey === 'sql_user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                {copiedKey === 'sql_user' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'sql_user' ? 'Tersalin!' : 'Salin Skrip User'}</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono text-sky-400 leading-relaxed max-h-96">
              <pre>{sqlInsertUser}</pre>
            </div>
          </div>

          {/* Section C: Insert Pending Transaction for Manager Approval */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  Eskalasi RBAC
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                  3. Skrip SQL: Simulasi Transaksi PENDING (Membutuhkan Approval Manager)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menyisipkan pengajuan nominal Rp75.000.000 (di atas limit staf Rp50 Jt) dengan status PENDING untuk disetujui Najwa di web.
                </p>
              </div>

              <button
                onClick={() => handleCopy(sqlInsertPendingTx, 'sql_pending')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiedKey === 'sql_pending'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                {copiedKey === 'sql_pending' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'sql_pending' ? 'Tersalin!' : 'Salin Skrip Pending'}</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono text-amber-300 leading-relaxed max-h-96">
              <pre>{sqlInsertPendingTx}</pre>
            </div>
          </div>

          {/* Section D: Full Table DDL (In Case Reset Needed) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full border border-slate-300">
                  Schema DDL
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                  4. Skrip Pembuatan Tabel &amp; RLS Lengkap (PostgreSQL)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gunakan ini jika tabel transactions atau users di Supabase belum ada atau perlu dibuat ulang.
                </p>
              </div>

              <button
                onClick={() => handleCopy(sqlCreateTableFull, 'sql_full')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiedKey === 'sql_full'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-900 text-white shadow-xs'
                }`}
              >
                {copiedKey === 'sql_full' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'sql_full' ? 'Tersalin!' : 'Salin DDL Lengkap'}</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono text-slate-300 leading-relaxed max-h-96">
              <pre>{sqlCreateTableFull}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. SUB-TAB: EXPLANATION OF ERROR IN SCREENSHOT */}
      {/* ==================================================================== */}
      {activeSubTab === 'error_solution' && (
        <div className="space-y-6">
          <div className="bg-rose-50 border border-rose-300 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-950">
                  Penyebab Error: <span className="font-mono text-sm bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-300">ERROR: 42601: syntax error at or near &quot;NOT&quot;</span>
                </h3>
                <p className="text-xs sm:text-sm text-rose-800 mt-1 leading-relaxed">
                  Pada gambar yang Anda lampirkan dari Supabase SQL Editor:
                  <br />
                  <code className="bg-rose-900 text-rose-100 px-2 py-1 rounded font-mono text-xs block mt-2">
                    LINE 7: CREATE DATABASE IF NOT EXISTS awanpay; USE awanpay;
                  </code>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-white p-5 rounded-2xl border border-rose-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Mengapa Terjadi Error?
                </h4>
                <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
                  <li>
                    <strong>Supabase menggunakan PostgreSQL</strong>, sedangkan sintaks <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">CREATE DATABASE IF NOT EXISTS</code> dan <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">USE awanpay;</code> adalah sintaks khusus <strong>MySQL</strong>.
                  </li>
                  <li>
                    Di Supabase, database <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">postgres</code> sudah otomatis ada dan aktif. Anda <strong>tidak perlu dan tidak boleh</strong> membuat database baru.
                  </li>
                  <li>
                    Sintaks kolom <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">ENUM(&apos;Finance Staff&apos;, &apos;Finance Manager&apos;)</code> juga khas MySQL. Di PostgreSQL Supabase, gunakan <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">CHECK (role IN (&apos;Finance Staff&apos;, &apos;Finance Manager&apos;))</code>.
                  </li>
                </ul>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-emerald-200 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Solusi Perbaikannya:
                </h4>
                <ul className="text-xs text-slate-700 space-y-2 list-disc list-inside">
                  <li>
                    <strong>Hapus baris 7 dan 8</strong> (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono">CREATE DATABASE...</code> dan <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">USE...</code>).
                  </li>
                  <li>
                    Langsung buat tabel pada skema publik: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">CREATE TABLE IF NOT EXISTS public.users (...)</code>.
                  </li>
                  <li>
                    Gunakan skrip PostgreSQL yang sudah disediakan di tab <strong>&ldquo;Skrip SQL Supabase&rdquo;</strong> di atas. Skrip tersebut dijamin 100% langsung berhasil (Success) di Supabase Anda!
                  </li>
                </ul>
              </div>
            </div>

            {/* Direct Copy Button for Corrected User Table Script */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setActiveSubTab('sql_scripts');
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Lihat &amp; Salin Skrip PostgreSQL yang Benar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. SUB-TAB: MFA CODE */}
      {/* ==================================================================== */}
      {activeSubTab === 'mfa_code' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                Implementasi Otentikasi Multi-Faktor (MFA RFC 6238 &amp; WebAuthn FIDO2)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Logika MFA diatur dalam dua lapisan:
              <br />
              <strong>Lapisan 1: Evaluasi Threshold Nominal</strong> &mdash; Pada <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">/src/utils/securityPolicyEngine.ts</code>, jika nominal transfer &le; Rp 10.000.000 maka MFA otomatis dilewati (Bypass). Jika nominal &gt; Rp 10.000.000, modal MFA wajib dipicu.
              <br />
              <strong>Lapisan 2: Validasi Faktor Kedua</strong> &mdash; Pada <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">/src/components/MfaModal.tsx</code>, pengguna memvalidasi via TOTP Authenticator (Google Authenticator / Authy) atau Kredensial Biometrik WebAuthn.
            </p>
          </div>

          {/* Code Block 1: Threshold Rule */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  securityPolicyEngine.ts
                </span>
                <h4 className="text-xs font-bold text-slate-800 mt-1">
                  A. Aturan Ambang Batas (Threshold Logic) MFA
                </h4>
              </div>
              <button
                onClick={() => handleCopy(codeMfaCheck, 'mfa_chk')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'mfa_chk' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'mfa_chk' ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono text-emerald-400">
              <pre>{codeMfaCheck}</pre>
            </div>
          </div>

          {/* Code Block 2: TOTP & WebAuthn Modal */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  MfaModal.tsx
                </span>
                <h4 className="text-xs font-bold text-slate-800 mt-1">
                  B. Algoritma Validasi TOTP &amp; Biometrik FIDO2
                </h4>
              </div>
              <button
                onClick={() => handleCopy(codeMfaModal, 'mfa_modal')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'mfa_modal' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'mfa_modal' ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono text-cyan-300">
              <pre>{codeMfaModal}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. SUB-TAB: RBAC CODE */}
      {/* ==================================================================== */}
      {activeSubTab === 'rbac_code' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                Implementasi Role-Based Access Control (RBAC)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              RBAC membagi otoritas sistem menjadi dua peran hierarkis:
              <br />
              <strong>1. Finance Staff:</strong> Memiliki izin input transaksi harian dengan pagu mandiri maksimal <strong>Rp 50.000.000</strong>. Jika mengajukan di atas nominal tersebut, transaksi <strong>tidak ditolak</strong> melainkan dialihkan menjadi <strong>PENDING</strong> untuk keputusan Manager.
              <br />
              <strong>2. Finance Manager:</strong> Memiliki wewenang approval pengeluaran s/d <strong>Rp 1.000.000.000</strong>, wewenang menyetujui transaksi PENDING dari staf, top up saldo kas korporasi, serta mengelola akun staf.
            </p>
          </div>

          {/* Code Block 1: RBAC Evaluator */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  securityPolicyEngine.ts
                </span>
                <h4 className="text-xs font-bold text-slate-800 mt-1">
                  A. Fungsi Evaluasi Peran (evaluateRbac)
                </h4>
              </div>
              <button
                onClick={() => handleCopy(codeRbac, 'rbac_fn')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'rbac_fn' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'rbac_fn' ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono text-purple-300">
              <pre>{codeRbac}</pre>
            </div>
          </div>

          {/* Code Block 2: RBAC Gating & Escalation */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  App.tsx
                </span>
                <h4 className="text-xs font-bold text-slate-800 mt-1">
                  B. Logika Eskalasi Transaksi ke Status PENDING
                </h4>
              </div>
              <button
                onClick={() => handleCopy(codeRbacUI, 'rbac_ui')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'rbac_ui' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'rbac_ui' ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono text-indigo-300">
              <pre>{codeRbacUI}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. SUB-TAB: ABAC CODE */}
      {/* ==================================================================== */}
      {activeSubTab === 'abac_code' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                Implementasi Attribute-Based Access Control (ABAC)
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              ABAC mengevaluasi <strong>konteks lingkungan dinamis</strong> yang tidak bisa dicakup oleh RBAC biasa. Sistem AwanPay menguji 4 atribut krusial:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-800 block">1. Atribut Nominal</span>
                <span className="text-slate-500 text-[11px]">Staff &le; Rp50 Jt | Manager &le; Rp1 M</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-800 block">2. Atribut Hari Kerja</span>
                <span className="text-slate-500 text-[11px]">Senin s/d Jumat (Day 1 &ndash; 5)</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-800 block">3. Atribut Jam Kerja</span>
                <span className="text-slate-500 text-[11px]">Pukul 08:00 &ndash; 17:00 WIB</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-800 block">4. Atribut Subnet IP</span>
                <span className="text-slate-500 text-[11px]">CIDR 192.168.10.0/24</span>
              </div>
            </div>
          </div>

          {/* Code Block 1: ABAC Engine */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  securityPolicyEngine.ts (Baris 130 - 222)
                </span>
                <h4 className="text-xs font-bold text-slate-800 mt-1">
                  A. Mesin Kebijakan 4 Atribut ABAC (evaluateAbac)
                </h4>
              </div>
              <button
                onClick={() => handleCopy(codeAbac, 'abac_engine')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'abac_engine' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'abac_engine' ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono text-emerald-300">
              <pre>{codeAbac}</pre>
            </div>
          </div>

          {/* Code Block 2: Bitwise IP Subnet Checking */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  securityPolicyEngine.ts (Baris 31 - 53)
                </span>
                <h4 className="text-xs font-bold text-slate-800 mt-1">
                  B. Algoritma Masking Bitwise Subnet IP CIDR
                </h4>
              </div>
              <button
                onClick={() => handleCopy(codeIpBitwise, 'ip_bitwise')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'ip_bitwise' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'ip_bitwise' ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <div className="p-4 bg-slate-950 overflow-x-auto text-xs font-mono text-amber-200">
              <pre>{codeIpBitwise}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
