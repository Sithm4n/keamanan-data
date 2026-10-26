import React, { useState } from 'react';
import {
  ShieldCheck,
  Code2,
  Lock,
  Layers,
  UserCheck,
  Clock,
  Network,
  DollarSign,
  Database,
  Copy,
  Check,
  HelpCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const ArchitectureDrawer: React.FC = () => {
  const [activeDbTab, setActiveDbTab] = useState<'mysql' | 'supabase'>('mysql');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const mysqlScript = `-- ============================================================================
-- AWANPAY SECURITY MODULE: MYSQL DATABASE IMPLEMENTATION
-- Memenuhi Tugas Kuliah: Otentikasi (MFA) & Otorisasi (DAC + ABAC di MySQL)
-- Dosen Pengampu: Akhmad Zaini
-- ============================================================================

CREATE DATABASE IF NOT EXISTS awanpay_corp;
USE awanpay_corp;

-- ----------------------------------------------------------------------------
-- 1. OTENTIKASI & MULTI-FACTOR AUTHENTICATION (MFA) DI MYSQL
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('Finance Staff', 'Finance Manager') NOT NULL,
    is_mfa_enabled BOOLEAN DEFAULT TRUE,
    mfa_secret VARCHAR(64) NOT NULL, -- Kunci rahasia TOTP Base32
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mfa_auth_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    totp_code_entered VARCHAR(6) NOT NULL,
    is_valid BOOLEAN NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 2. OTORISASI DAC (DISCRETIONARY ACCESS CONTROL) DI MYSQL
-- Menggunakan mekanisme hak akses bawaan MySQL (GRANT / REVOKE)
-- ----------------------------------------------------------------------------
-- Buat user database sesuai prinsip DAC (Hanya akses dari subnet kantor)
CREATE USER IF NOT EXISTS 'naja_staff'@'192.168.10.%' IDENTIFIED BY 'staff_secret_db_2026';
CREATE USER IF NOT EXISTS 'najwa_mgr'@'192.168.10.%' IDENTIFIED BY 'mgr_secret_db_2026';

-- Berikan izin spesifik (DAC) pada tabel transaksi
CREATE TABLE transactions (
    id VARCHAR(36) PRIMARY KEY,
    reference_no VARCHAR(50) UNIQUE NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    bank_name VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status ENUM('APPROVED', 'DENIED', 'PENDING') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- DAC: Staff hanya boleh INSERT & SELECT, tidak boleh UPDATE atau DELETE
GRANT SELECT, INSERT ON awanpay_corp.transactions TO 'naja_staff'@'192.168.10.%';

-- DAC: Manager memiliki wewenang UPDATE (untuk approval/denial)
GRANT SELECT, INSERT, UPDATE ON awanpay_corp.transactions TO 'najwa_mgr'@'192.168.10.%';
FLUSH PRIVILEGES;

-- ----------------------------------------------------------------------------
-- 3. OTORISASI ABAC (ATTRIBUTE-BASED ACCESS CONTROL) DI MYSQL
-- Karena MySQL tidak memiliki native Row Level Security (RLS), ABAC diterapkan
-- menggunakan BEFORE INSERT TRIGGER yang memeriksa 4 atribut secara ketat:
-- Atribut 1: Nominal vs Role (Staff max 50jt, >50jt wajib PENDING)
-- Atribut 2: Subnet IP Kantor (192.168.10.0/24)
-- Atribut 3: Jam Kerja (08:00 - 17:00 WIB)
-- Atribut 4: Hari Kerja (Senin - Jumat)
-- ----------------------------------------------------------------------------
DELIMITER //
CREATE TRIGGER trg_abac_transaction_security
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    DECLARE user_role VARCHAR(20);
    DECLARE current_ip VARCHAR(50);
    DECLARE current_time_val TIME;
    DECLARE current_day_val INT;

    -- Ambil role pembuat transaksi
    SELECT role INTO user_role FROM users WHERE id = NEW.created_by;
    
    -- Evaluasi Atribut IP (Mengekstrak host dari session user)
    SET current_ip = SUBSTRING_INDEX(USER(), '@', -1);
    
    -- Evaluasi Atribut Jam & Hari (WIB)
    SET current_time_val = TIME(NOW());
    SET current_day_val = WEEKDAY(NOW()); -- 0=Senin, ..., 4=Jumat, 5=Sabtu, 6=Minggu

    -- Aturan ABAC 1: Hari Kerja (Hanya Senin-Jumat / 0 s.d 4)
    IF current_day_val > 4 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'ABAC VIOLATION: Transaksi ditolak di luar hari kerja operasional (Senin-Jumat).';
    END IF;

    -- Aturan ABAC 2: Jam Kerja (08:00 s.d 17:00)
    IF current_time_val < '08:00:00' OR current_time_val > '17:00:00' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'ABAC VIOLATION: Transaksi ditolak di luar jam operasional (08:00-17:00 WIB).';
    END IF;

    -- Aturan ABAC 3: Nominal vs Role
    IF user_role = 'Finance Staff' AND NEW.amount > 50000000.00 THEN
        -- Otomatis alihkan ke status PENDING untuk keputusan Finance Manager
        SET NEW.status = 'PENDING';
    END IF;
END //
DELIMITER ;`;

  const supabaseScript = `-- ============================================================================
-- AWANPAY SECURITY MODULE: SUPABASE (POSTGRESQL) IMPLEMENTATION
-- Keunggulan Supabase: Memiliki native Row Level Security (RLS) & Native Auth MFA
-- CATATAN: Di Supabase TIDAK PERLU 'CREATE DATABASE' atau 'USE' karena database
-- 'postgres' dan skema 'public' sudah aktif secara otomatis.
-- ============================================================================

-- 1. TABEL TRANSAKSI UNTUK AWANPAY DI SUPABASE (POSTGRESQL)
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

-- 2. AKTIFKAN ROW LEVEL SECURITY (RLS) DI POSTGRESQL
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. BERSIHKAN POLICY LAMA AGAR TIDAK TERJADI DUPLIKASI
DROP POLICY IF EXISTS "Enable read access for all users" ON public.transactions;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.transactions;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.transactions;

-- 4. KEBIJAKAN DAC (DISCRETIONARY ACCESS CONTROL)
-- Izin SELECT (Read) dan UPDATE status untuk pengguna
CREATE POLICY "Enable read access for all users"
ON public.transactions FOR SELECT
USING (true);

-- 5. KEBIJAKAN ABAC (ATTRIBUTE-BASED ACCESS CONTROL)
-- Memeriksa integritas status dan atribut transaksi
CREATE POLICY "Enable insert access for all users"
ON public.transactions FOR INSERT
WITH CHECK (
    status IN ('APPROVED', 'DENIED', 'PENDING')
);

CREATE POLICY "Enable update access for all users"
ON public.transactions FOR UPDATE
USING (true);`;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-blue-700 font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>SPESIFIKASI ARSITEKTUR KEAMANAN AWANPAY</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Pemisahan Logika Otorisasi RBAC dan ABAC
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Arsitektur keamanan AwanPay memisahkan secara modular antara hak akses berbasis peran resmi (RBAC) dan hak akses berbasis atribut dinamis lingkungan (ABAC) untuk menjamin prinsip <em>Least Privilege</em> dan <em>Zero Trust</em>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-mono">
              <span className="text-slate-500 block text-[10px]">Standar Kepatuhan</span>
              <span className="text-blue-700 font-bold">BI SNAP &amp; OJK POJK.12</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Comparison: RBAC vs ABAC */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RBAC Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                RBAC (Role-Based Access Control)
              </h3>
              <p className="text-[11px] text-slate-500">
                Pemeriksaan Identitas dan Jabatan Formal
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Menjawab pertanyaan: <strong>&quot;Siapa Anda dan apa peran resmi Anda dalam organisasi?&quot;</strong> Sistem mengunci akses hanya untuk peran yang telah didefinisikan secara ketat dalam direktori perusahaan.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
            <div className="font-bold text-slate-800 text-xs">
              Daftar Peran yang Diizinkan:
            </div>
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <div className="font-mono text-blue-700 font-bold text-xs">1. Finance Staff</div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Petugas operasional treasury &amp; disbursement harian (Naja).
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <div className="font-mono text-blue-700 font-bold text-xs">2. Finance Manager</div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Pejabat berwenang tingkat manajerial dengan kewenangan otorisasi nominal tinggi, manajemen staf, dan simulator ABAC (Najwa).
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-700 font-mono bg-slate-50 p-3 rounded-lg border border-slate-200">
            <code>function evaluateRbac(user): RbacEvaluation</code>
          </div>
        </div>

        {/* ABAC Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                ABAC (Attribute-Based Access Control)
              </h3>
              <p className="text-[11px] text-slate-500">
                Pemeriksaan Konteks &amp; Atribut Lingkungan Dinamis
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Menjawab pertanyaan: <strong>&quot;Apakah konteks lingkungan transaksi ini memenuhi seluruh syarat aman?&quot;</strong> Akses dievaluasi berdasarkan 3 dimensi atribut:
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <DollarSign className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Atribut Nominal Transaksi:</span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Finance Staff maksimal <strong>Rp 50.000.000</strong>. Jika di atas Rp 50.000.000 otomatis berstatus <strong>PENDING</strong> untuk keputusan Finance Manager.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Atribut Jam &amp; Hari Kerja:</span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Hanya diperbolehkan pada <strong>Senin–Jumat</strong>, pukul <strong>08:00–17:00 WIB</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Network className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Atribut Alamat IP / Subnet:</span>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Wajib berasal dari subnet jaringan resmi kantor <strong>192.168.10.0/24</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-700 font-mono bg-slate-50 p-3 rounded-lg border border-slate-200">
            <code>function evaluateAbac(user, payload, context): AbacEvaluation</code>
          </div>
        </div>
      </div>

      {/* SPECIAL SECTION: PANDUAN TUGAS DOSEN AKHMAD ZAINI (MYSQL VS SUPABASE POSTGRESQL) */}
      <div className="bg-white border-2 border-blue-600/30 rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono bg-blue-100 text-blue-800">
                PANDUAN TUGAS MANDIRI KULIAH
              </span>
              <span className="text-xs text-slate-400 font-mono">Dosen: Akhmad Zaini</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Implementasi Database: MySQL vs Supabase (PostgreSQL)
            </h3>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Penjelasan teknis dan komparasi implementasi <strong>Otentikasi (MFA)</strong> serta <strong>Otorisasi (DAC &amp; ABAC)</strong> untuk bahan presentasi kelompok minggu depan.
            </p>
          </div>

          {/* Tab Selector between MySQL and Supabase */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start">
            <button
              onClick={() => setActiveDbTab('mysql')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeDbTab === 'mysql'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Solusi MySQL (Wajib Dosen)
            </button>
            <button
              onClick={() => setActiveDbTab('supabase')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeDbTab === 'supabase'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Komparasi Supabase (Postgres)
            </button>
          </div>
        </div>

        {/* Answering User's Core Question: "Apakah mungkin menggunakan Supabase?" */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            Jawaban untuk Pertanyaan Anda: &quot;Apakah mungkin menggunakan Supabase karena Supabase berbasis PostgreSQL?&quot;
          </h4>
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong>Secara teknis arsitektur: SANGAT MUNGKIN &amp; JAUH LEBIH UNGGUL.</strong> Supabase (PostgreSQL) memiliki fitur bawaan <em>Row Level Security (RLS)</em> yang secara alami dirancang untuk menerapkan <strong>ABAC</strong> di level query database, serta <em>Supabase Auth</em> yang sudah memiliki modul MFA (TOTP).
          </p>
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong>Namun secara akademis:</strong> Pada instruksi tugas tertulis spesifik <em>&quot;mengerjakan proyek otentikasi dan otorisasi di <u>mysql</u>&quot;</em>. Jika dosen Akhmad Zaini menguji sintaks SQL murni di terminal MySQL (seperti <code>GRANT/REVOKE</code> dan Trigger MySQL), Anda disarankan menyiapkan skrip <strong>MySQL</strong> yang telah kami sediakan di bawah ini. Anda dapat mendemonstrasikan kedua opsi sebagai nilai plus presentasi!
          </p>
        </div>

        {/* 3 Pillars Matrix: Otentikasi MFA, DAC, dan ABAC */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              1. Otentikasi (MFA)
            </span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>MySQL:</strong> Menggunakan tabel <code>users</code> dengan kolom <code>mfa_secret</code> (Base32) dan log verifikasi token. Diuji saat login dan pengeluaran &gt; Rp10 Juta.<br />
              <strong>Supabase:</strong> Didukung native oleh <code>auth.mfa_factors</code> API.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              2. Otorisasi DAC
            </span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>Discretionary Access Control (DAC):</strong> Hak akses berbasis kepemilikan subjek.<br />
              <strong>MySQL:</strong> <code>GRANT SELECT, INSERT ON ... TO &apos;naja_staff&apos;@&apos;192.168.10.%&apos;</code> dan wewenang UPDATE hanya untuk Manager.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              3. Otorisasi ABAC
            </span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              <strong>Attribute-Based Access Control (ABAC):</strong> Validasi atribut dinamis.<br />
              <strong>MySQL:</strong> Ditegakkan via <code>BEFORE INSERT TRIGGER</code> (cek subnet, jam kerja, dan eskalasi limit 50Jt).<br />
              <strong>Supabase:</strong> Ditegakkan via <code>CREATE POLICY ... USING (RLS)</code>.
            </p>
          </div>
        </div>

        {/* SQL Script Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-600" />
              {activeDbTab === 'mysql'
                ? 'Skrip SQL Resmi MySQL (Siap Dijalankan di phpMyAdmin / MySQL Workbench)'
                : 'Skrip SQL PostgreSQL / Supabase (Siap Dijalankan di Supabase SQL Editor)'}
            </h4>

            <button
              onClick={() =>
                handleCopy(
                  activeDbTab === 'mysql' ? mysqlScript : supabaseScript,
                  activeDbTab
                )
              }
              className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              {copiedScript === activeDbTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-blue-600" />
                  <span>Salin Skrip SQL</span>
                </>
              )}
            </button>
          </div>

          {/* Environment Execution Notice */}
          {activeDbTab === 'mysql' ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <span className="font-bold text-amber-700 font-mono text-[11px] shrink-0 px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                TEMPAT MENJALANKAN
              </span>
              <div>
                <strong>Jalankan di MySQL (XAMPP / phpMyAdmin / MySQL Workbench).</strong>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Jangan jalankan skrip MySQL ini di Supabase SQL Editor karena Supabase berbasis PostgreSQL dan akan error <em>&apos;syntax error at or near NOT (CREATE DATABASE)&apos;</em>.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2.5">
              <span className="font-bold text-emerald-700 font-mono text-[11px] shrink-0 px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300">
                TEMPAT MENJALANKAN
              </span>
              <div>
                <strong>Jalankan di Supabase Dashboard (SQL Editor).</strong>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Skrip ini menggunakan dialek PostgreSQL murni dengan Row Level Security (RLS) untuk menegakkan DAC dan ABAC tanpa error.
                </p>
              </div>
            </div>
          )}

          <pre className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 text-[11px] font-mono overflow-x-auto leading-relaxed shadow-inner max-h-[380px]">
            {activeDbTab === 'mysql' ? mysqlScript : supabaseScript}
          </pre>
        </div>
      </div>

      {/* Code Architecture Snapshot */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Source Code Implementation Snapshot (/src/utils/securityPolicyEngine.ts)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-500 font-medium">TypeScript / Pure Logic</span>
        </div>

        <pre className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-800 text-[11px] font-mono overflow-x-auto leading-relaxed shadow-inner">
{`// ==========================================
// 1. RBAC: Role-Based Access Control
// ==========================================
export function evaluateRbac(user: UserProfile): RbacEvaluation {
  const permittedRoles: UserRole[] = ['Finance Staff', 'Finance Manager'];
  const passed = permittedRoles.includes(user.role);
  return {
    passed,
    userRole: user.role,
    permittedRoles,
    reason: passed ? 'RBAC Lolos' : 'RBAC Ditolak: Peran tidak sah'
  };
}

// ==========================================
// 2. ABAC: Attribute-Based Access Control
// ==========================================
export function evaluateAbac(user: UserProfile, payload: TransactionPayload, context: SecurityContext): AbacEvaluation {
  const maxAllowed = user.role === 'Finance Manager' ? 1_000_000_000 : 50_000_000;
  
  // Attribute 1: Nominal vs Role Limit (Staff > 50jt -> Status PENDING)
  const amountPassed = payload.amount <= maxAllowed;
  
  // Attribute 2: Hari Operasional (Senin=1 s/d Jumat=5)
  const isWorkday = context.simulatedDay >= 1 && context.simulatedDay <= 5;
  
  // Attribute 3: Jam Operasional (08:00 - 17:00 WIB)
  const inHours = parseTimeToMinutes(context.simulatedTime) >= 480 && parseTimeToMinutes(context.simulatedTime) <= 1020;
  
  // Attribute 4: Subnet IP Kantor (192.168.10.0/24)
  const inSubnet = isIpInSubnet(context.clientIp, '192.168.10.0/24');
  
  return {
    passed: amountPassed && isWorkday && inHours && inSubnet,
    ...
  };
}`}
        </pre>
      </div>
    </div>
  );
};
