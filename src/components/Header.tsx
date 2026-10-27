import React from 'react';
import {
  ShieldCheck,
  UserCheck,
  LogOut,
  Terminal,
  BookOpen,
  SlidersHorizontal,
  Lock,
  Users,
  Database,
  Code2,
} from 'lucide-react';
import { UserProfile } from '../types/security';

interface HeaderProps {
  currentUser: UserProfile;
  activeTab: 'transaction' | 'audit_logs' | 'architecture' | 'code_reference';
  setActiveTab: (tab: 'transaction' | 'audit_logs' | 'architecture' | 'code_reference') => void;
  onLogout: () => void;
  simulatorOpen: boolean;
  setSimulatorOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  onOpenStaffManagement: () => void;
  onOpenSupabase: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  simulatorOpen,
  setSimulatorOpen,
  onOpenStaffManagement,
  onOpenSupabase,
}) => {
  const isManager = currentUser.role === 'Finance Manager';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
                AwanPay <span className="text-blue-600 font-semibold">Security</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono tracking-wide">
                Corporate Digital Wallet
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Single-Line) */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setActiveTab('transaction')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'transaction'
                  ? 'bg-blue-50 text-blue-700 shadow-xs border border-blue-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Transfer &amp; Otorisasi
            </button>

            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'audit_logs'
                  ? 'bg-blue-50 text-blue-700 shadow-xs border border-blue-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Log Audit Keamanan
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'architecture'
                  ? 'bg-blue-50 text-blue-700 shadow-xs border border-blue-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Spesifikasi RBAC vs ABAC
            </button>

            <button
              onClick={() => setActiveTab('code_reference')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'code_reference'
                  ? 'bg-blue-50 text-blue-700 shadow-xs border border-blue-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-blue-600" />
              Inspeksi Kode &amp; SQL Supabase
            </button>
          </nav>

          {/* Zone 3: Manager Controls, Supabase Status & User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Supabase Live Connection Indicator & Modal Trigger */}
            <button
              onClick={onOpenSupabase}
              title="Database Supabase Terhubung (Proyek: fefckqapttnkgwwwvyyv)"
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Supabase</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            {/* If Finance Manager: Staff Management Modal Trigger */}
            {isManager && (
              <button
                onClick={onOpenStaffManagement}
                title="Kelola akun Finance Staff (tambah atau hapus staff)"
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Kelola Staf</span>
              </button>
            )}

            {/* ABAC Simulator Toggle: Accessible for Manager, Locked indicator for Staff */}
            {isManager ? (
              <button
                onClick={() => setSimulatorOpen((prev) => !prev)}
                title="Buka/Tutup Simulator Lingkungan ABAC (Akses Khusus Finance Manager)"
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  simulatorOpen
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Simulator ABAC</span>
              </button>
            ) : (
              <div
                title="Pengaturan simulator ABAC hanya dapat diakses oleh Finance Manager"
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-slate-100 text-slate-400 flex items-center gap-1.5 cursor-not-allowed"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">Simulator (Manager Only)</span>
              </div>
            )}

            {/* Profile Block with strict Logout (no instant switch) */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                  {currentUser.fullName}
                </div>
                <div
                  className={`text-[10px] font-mono font-bold ${
                    isManager ? 'text-blue-600' : 'text-slate-500'
                  }`}
                >
                  {currentUser.role}
                </div>
              </div>

              {/* Logout Button: Strict requirement to switch account */}
              <button
                onClick={onLogout}
                title="Logout dari akun saat ini untuk berganti akun atau peran"
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
