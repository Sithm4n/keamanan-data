import React, { useState } from 'react';
import {
  Send,
  Building2,
  DollarSign,
  FileText,
  CreditCard,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile, TransactionPayload } from '../types/security';
import { PRESET_TRANSACTIONS } from '../data/mockData';
import { formatIDR, checkMfaRequirement } from '../utils/securityPolicyEngine';

interface TransactionFormProps {
  currentUser: UserProfile;
  transaction: TransactionPayload;
  setTransaction: React.Dispatch<React.SetStateAction<TransactionPayload>>;
  onSubmitTransaction: () => void;
  isSubmitting: boolean;
  corporateBalance: number;
  onOpenTopUp?: () => void;
}

const INDONESIAN_BANKS = [
  'Bank Central Asia (BCA)',
  'Bank Mandiri',
  'Bank Negara Indonesia (BNI)',
  'Bank Rakyat Indonesia (BRI)',
  'Bank CIMB Niaga',
  'Bank Permata',
  'Bank Danamon',
  'Bank BTPN / Jenius Corp',
];

const CORPORATE_DEPARTMENTS = [
  'Finance & Treasury Operations',
  'Procurement & General Affairs',
  'Infrastructure & Cloud IT',
  'Marketing & Growth',
  'Human Resources & Payroll',
  'Legal & Corporate Governance',
];

export const TransactionForm: React.FC<TransactionFormProps> = ({
  currentUser,
  transaction,
  setTransaction,
  onSubmitTransaction,
  isSubmitting,
  corporateBalance,
  onOpenTopUp,
}) => {
  const [amountInputStr, setAmountInputStr] = useState<string>(
    transaction.amount ? transaction.amount.toLocaleString('id-ID') : '4500000'
  );

  const handleAmountChange = (raw: string) => {
    const cleanNumbers = raw.replace(/\D/g, '');
    const num = cleanNumbers ? parseInt(cleanNumbers, 10) : 0;
    setTransaction((prev) => ({ ...prev, amount: num }));
    setAmountInputStr(num ? num.toLocaleString('id-ID') : '');
  };

  const handleApplyPreset = (preset: (typeof PRESET_TRANSACTIONS)[0]) => {
    setTransaction({
      recipientName: preset.recipientName,
      recipientAccount: preset.recipientAccount,
      bankName: preset.bankName,
      amount: preset.amount,
      description: preset.description,
      department: preset.department,
    });
    setAmountInputStr(preset.amount.toLocaleString('id-ID'));
  };

  const addAmount = (increment: number) => {
    const next = (transaction.amount || 0) + increment;
    setTransaction((prev) => ({ ...prev, amount: next }));
    setAmountInputStr(next.toLocaleString('id-ID'));
  };

  const isMfaRequired = checkMfaRequirement(transaction.amount);
  const isBalanceSufficient = corporateBalance >= transaction.amount;
  const isManager = currentUser.role === 'Finance Manager';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600" />
            Formulir Pengajuan Transfer Korporat
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Setiap pengajuan transaksi diverifikasi seketika oleh kebijakan keamanan RBAC, ABAC, dan MFA Gatekeeper
          </p>
        </div>

        {/* Dynamic Corporate Balance Indicator & Top Up Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-right">
            <span className="text-[11px] text-slate-500 font-medium block">Saldo Kas Operasional</span>
            <span className="text-base font-mono font-bold text-slate-900">
              {formatIDR(corporateBalance)}
            </span>
          </div>

          {isManager && (
            <button
              type="button"
              onClick={onOpenTopUp}
              title="Tambah / Injeksi Saldo Kas Operasional (Khusus Manager)"
              className="px-3 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer h-full"
            >
              <span>+ Tambah Kas</span>
            </button>
          )}
        </div>
      </div>

      {/* Preset Test Case Scenarios */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Template Skenario Uji Cepat Kebijakan:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PRESET_TRANSACTIONS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="text-left p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
            >
              <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700">
                {idx + 1}. {p.amount <= 10000000 ? '≤ 10 Juta' : p.amount <= 50000000 ? '10–50 Juta' : '> 50 Juta'}
              </div>
              <div className="text-xs font-mono text-blue-600 font-bold mt-0.5">
                {formatIDR(p.amount)}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-1">
                {p.recipientName}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Inputs Grid */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmitTransaction();
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recipient Bank */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Bank Penerima
            </label>
            <select
              value={transaction.bankName}
              onChange={(e) => setTransaction((prev) => ({ ...prev, bankName: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
              required
            >
              {INDONESIAN_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Account Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              Nomor Rekening Tujuan
            </label>
            <input
              type="text"
              value={transaction.recipientAccount}
              onChange={(e) =>
                setTransaction((prev) => ({ ...prev, recipientAccount: e.target.value }))
              }
              placeholder="Contoh: 8839019283"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:border-blue-600 focus:bg-white focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Beneficiary Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Nama Rekening Penerima (Beneficiary Name)
            </label>
            <input
              type="text"
              value={transaction.recipientName}
              onChange={(e) =>
                setTransaction((prev) => ({ ...prev, recipientName: e.target.value }))
              }
              placeholder="Contoh: PT Cloud Infrastructure Nusantara"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
              required
            />
          </div>

          {/* Department / Cost Center */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Departemen / Cost Center
            </label>
            <select
              value={transaction.department}
              onChange={(e) =>
                setTransaction((prev) => ({ ...prev, department: e.target.value }))
              }
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
            >
              {CORPORATE_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Transaction Amount */}
        <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-blue-600" />
              Nominal Transfer (IDR)
            </label>
            <div className="text-xs font-mono">
              {isMfaRequired ? (
                <span className="text-amber-800 font-bold px-2 py-0.5 rounded bg-amber-100 border border-amber-300">
                  &gt; Rp10.000.000 (MFA Wajib Aktif)
                </span>
              ) : (
                <span className="text-emerald-800 font-bold px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300">
                  ≤ Rp10.000.000 (MFA Bypass)
                </span>
              )}
            </div>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-base font-bold">
              Rp
            </span>
            <input
              type="text"
              value={amountInputStr}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0"
              className="w-full bg-white border border-slate-300 rounded-lg pl-12 pr-4 py-2.5 text-base text-slate-900 font-mono font-bold focus:border-blue-600 focus:outline-none shadow-xs"
              required
            />
          </div>

          {/* Quick Increment Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-slate-500 font-medium mr-1">Tambah nominal cepat:</span>
            <button
              type="button"
              onClick={() => addAmount(5000000)}
              className="px-2.5 py-1 text-[11px] font-mono bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 transition-colors font-medium"
            >
              +5 Juta
            </button>
            <button
              type="button"
              onClick={() => addAmount(10000000)}
              className="px-2.5 py-1 text-[11px] font-mono bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 transition-colors font-medium"
            >
              +10 Juta
            </button>
            <button
              type="button"
              onClick={() => addAmount(50000000)}
              className="px-2.5 py-1 text-[11px] font-mono bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 transition-colors font-medium"
            >
              +50 Juta
            </button>
            <button
              type="button"
              onClick={() => {
                setTransaction((prev) => ({ ...prev, amount: 8500000 }));
                setAmountInputStr((8500000).toLocaleString('id-ID'));
              }}
              className="px-2.5 py-1 text-[11px] font-mono bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-300 transition-colors font-bold"
            >
              Set Rp8.5 Jt (≤ 10M)
            </button>
            <button
              type="button"
              onClick={() => {
                setTransaction((prev) => ({ ...prev, amount: 65000000 }));
                setAmountInputStr((65000000).toLocaleString('id-ID'));
              }}
              className="px-2.5 py-1 text-[11px] font-mono bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-300 transition-colors font-bold"
            >
              Set Rp65 Jt (&gt; 50M)
            </button>
          </div>
        </div>

        {/* Purpose / Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Keterangan / Keperluan Transaksi
          </label>
          <input
            type="text"
            value={transaction.description}
            onChange={(e) =>
              setTransaction((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Contoh: Tagihan Lisensi Cloud Hosting Q4 2026"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
            required
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Diajukan oleh: </span>
            <span className="font-bold text-slate-800">{currentUser.fullName}</span>
            <span className="font-mono text-blue-600 font-bold">({currentUser.role})</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !transaction.amount}
            className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <span>Kirim &amp; Evaluasi Otorisasi</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
