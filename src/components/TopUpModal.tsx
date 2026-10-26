import React, { useState } from 'react';
import {
  Wallet,
  PlusCircle,
  X,
  Building,
  CheckCircle2,
  DollarSign,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { formatIDR } from '../utils/securityPolicyEngine';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onTopUpSuccess: (amount: number, source: string, description: string) => void;
}

const CASH_SOURCES = [
  'Rekening Kas Induk Korporat - Bank Mandiri (008-9921-831)',
  'Pencairan Deposito Berjangka Seri B - BCA (112-990-128)',
  'Penerimaan Settlement Pembayaran Invoice Client Q4',
  'Injeksi Modal Kerja Tambahan Pemegang Saham (Equity)',
  'Rekening Operasional Cadangan Likuiditas - BNI (551-092-311)',
];

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  onTopUpSuccess,
}) => {
  const [amountStr, setAmountStr] = useState('100000000');
  const [source, setSource] = useState(CASH_SOURCES[0]);
  const [description, setDescription] = useState('Penambahan Kas Operasional Harian Perusahaan');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentAmountNum = parseInt(amountStr.replace(/\D/g, ''), 10) || 0;

  const handleAmountChange = (raw: string) => {
    const cleanNumbers = raw.replace(/\D/g, '');
    setAmountStr(cleanNumbers ? parseInt(cleanNumbers, 10).toLocaleString('id-ID') : '');
    setErrorMsg(null);
  };

  const addPreset = (addVal: number) => {
    const next = currentAmountNum + addVal;
    setAmountStr(next.toLocaleString('id-ID'));
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAmountNum <= 0) {
      setErrorMsg('Nominal penambahan saldo kas harus lebih besar dari Rp 0.');
      return;
    }

    onTopUpSuccess(currentAmountNum, source, description);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Tambah Saldo Kas Operasional
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Manager Only
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Injeksi likuiditas kas dompet digital korporat AwanPay
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current Balance Indicator */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">Saldo Kas Saat Ini:</span>
            <span className="font-mono text-base font-bold text-slate-900">
              {formatIDR(currentBalance)}
            </span>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Nominal Injeksi Kas (IDR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-base font-bold">
                Rp
              </span>
              <input
                type="text"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-slate-300 rounded-xl pl-12 pr-4 py-2.5 text-base text-slate-900 font-mono font-bold focus:border-emerald-600 focus:outline-none shadow-xs"
                required
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => addPreset(50000000)}
                className="px-2.5 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 font-medium transition-colors cursor-pointer"
              >
                +50 Jt
              </button>
              <button
                type="button"
                onClick={() => addPreset(100000000)}
                className="px-2.5 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 font-medium transition-colors cursor-pointer"
              >
                +100 Jt
              </button>
              <button
                type="button"
                onClick={() => addPreset(250000000)}
                className="px-2.5 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 font-medium transition-colors cursor-pointer"
              >
                +250 Jt
              </button>
              <button
                type="button"
                onClick={() => addPreset(500000000)}
                className="px-2.5 py-1 text-xs font-mono bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-300 font-bold transition-colors cursor-pointer"
              >
                +500 Jt
              </button>
              <button
                type="button"
                onClick={() => setAmountStr((1000000000).toLocaleString('id-ID'))}
                className="px-2.5 py-1 text-xs font-mono bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg border border-blue-300 font-bold transition-colors cursor-pointer"
              >
                Set 1 Milyar
              </button>
            </div>
          </div>

          {/* Cash Source */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              Sumber Rekening / Kanal Likuiditas
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
            >
              {CASH_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Keterangan Injeksi Kas
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
              required
            />
          </div>

          {/* Estimated Balance Preview */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="text-emerald-900 font-medium">Estimasi Saldo Baru Setelah Injeksi:</span>
            <span className="font-mono font-bold text-emerald-800 text-sm">
              {formatIDR(currentBalance + currentAmountNum)}
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Injeksi Saldo Kas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
