import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Fingerprint,
  KeyRound,
  Copy,
  Check,
  AlertCircle,
  X,
  Loader2,
  Clock,
} from 'lucide-react';
import { TransactionPayload } from '../types/security';
import { generateLiveTotp, verifyTotpCode, getExpiredTotp } from '../utils/totpGenerator';
import { formatIDR } from '../utils/securityPolicyEngine';

interface MfaModalProps {
  isOpen: boolean;
  transaction: TransactionPayload;
  onSuccess: (method: 'TOTP_AUTH' | 'BIOMETRIC_WEBAUTHN', verifiedCode?: string) => void;
  onCancel: (reason: string) => void;
}

export const MfaModal: React.FC<MfaModalProps> = ({
  isOpen,
  transaction,
  onSuccess,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'totp' | 'biometric'>('totp');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Live Token Rolling State
  const [liveToken, setLiveToken] = useState(() => generateLiveTotp());

  // Biometric state
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update live rolling token every second
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setLiveToken(generateLiveTotp());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Reset inputs when modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setErrorMsg(null);
      setIsVerifying(false);
      setBiometricScanning(false);
      setBiometricSuccess(false);

      // Focus first input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, val: string) => {
    setErrorMsg(null);
    const cleaned = val.replace(/\D/g, '');

    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    // Single character input
    if (cleaned.length === 1) {
      const next = [...digits];
      next[index] = cleaned;
      setDigits(next);
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
      return;
    }

    // Pasted multi-character string
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6).split('');
      const next = [...digits];
      pasted.forEach((char, i) => {
        if (index + i < 6) {
          next[index + i] = char;
        }
      });
      setDigits(next);
      const nextFocus = Math.min(index + pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      handleSubmitTotp();
    }
  };

  const handleSubmitTotp = () => {
    const fullCode = digits.join('');
    if (fullCode.length !== 6) {
      setErrorMsg('Masukkan 6-digit kode keamanan TOTP lengkap.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    setTimeout(() => {
      setIsVerifying(false);
      // Strictly verifies against current active window
      const result = verifyTotpCode(fullCode);

      if (result.isValid) {
        onSuccess('TOTP_AUTH', fullCode);
      } else {
        setErrorMsg(result.reason || 'Kode TOTP salah atau telah kadaluarsa.');
      }
    }, 400);
  };

  const handleAutofillValidToken = () => {
    const valid = liveToken.code.split('');
    setDigits(valid);
    setErrorMsg(null);
    inputRefs.current[5]?.focus();
  };

  const handleAutofillExpiredToken = () => {
    // Fill with guaranteed expired token from previous window
    const expired = getExpiredTotp().split('');
    setDigits(expired);
    setErrorMsg(null);
    inputRefs.current[5]?.focus();
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(liveToken.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSimulateBiometric = () => {
    setBiometricScanning(true);
    setErrorMsg(null);

    setTimeout(() => {
      setBiometricScanning(false);
      setBiometricSuccess(true);
      setTimeout(() => {
        onSuccess('BIOMETRIC_WEBAUTHN');
      }, 500);
    }, 1200);
  };

  const handleSimulateBiometricFailure = () => {
    setBiometricScanning(true);
    setErrorMsg(null);

    setTimeout(() => {
      setBiometricScanning(false);
      setErrorMsg('Autentikasi biometrik gagal: Sidik jari/wajah tidak cocok.');
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Verifikasi Multi-Factor (MFA Berlapis)
              </h2>
              <p className="text-xs text-blue-700 font-semibold mt-0.5">
                Otorisasi Tambahan Transaksi &gt; Rp10.000.000
              </p>
            </div>
          </div>
          <button
            onClick={() => onCancel('MFA Dibatalkan oleh pengguna')}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Summary Strip */}
        <div className="bg-slate-100/70 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-medium">Penerima: </span>
            <span className="font-bold text-slate-900">{transaction.recipientName}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 font-medium">Nominal: </span>
            <span className="font-mono font-bold text-blue-600 text-sm">
              {formatIDR(transaction.amount)}
            </span>
          </div>
        </div>

        {/* Method Selector Tabs */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                setActiveTab('totp');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'totp'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-blue-600" />
              Kode TOTP (Aplikasi Authenticator)
            </button>
            <button
              onClick={() => {
                setActiveTab('biometric');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'biometric'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
              Biometrik Passkey (WebAuthn)
            </button>
          </div>
        </div>

        {/* Tab 1: TOTP Code Input */}
        {activeTab === 'totp' && (
          <div className="p-6 space-y-5">
            <div className="space-y-1 text-center">
              <p className="text-xs text-slate-600">
                Masukkan 6-digit kode Time-based One-Time Password dari aplikasi authenticator korporat AwanPay Anda:
              </p>
            </div>

            {/* 6 Digit Inputs */}
            <div className="flex justify-center gap-2.5 sm:gap-3">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-bold rounded-xl border transition-all focus:outline-none ${
                    errorMsg
                      ? 'border-rose-400 bg-rose-50 text-rose-800'
                      : digit
                      ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-xs'
                      : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-blue-600 focus:bg-white'
                  }`}
                />
              ))}
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Virtual Authenticator Helper for prototype testing */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Simulator Token Virtual Korporat:
                </span>
                <span className="font-mono text-blue-700 text-[11px] font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-500" />
                  Kadaluarsa dlm {liveToken.remainingSeconds}s
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white border border-slate-200 px-3.5 py-2.5 rounded-lg shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-slate-900 tracking-wider">
                    {liveToken.code.slice(0, 3)} {liveToken.code.slice(3)}
                  </span>
                  <button
                    onClick={handleCopyToken}
                    title="Salin Kode TOTP"
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {copiedCode ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAutofillValidToken}
                    className="px-2.5 py-1 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors"
                  >
                    Gunakan Kode Aktif
                  </button>
                  <button
                    onClick={handleAutofillExpiredToken}
                    title="Uji coba memasukkan kode yang sudah kadaluarsa (harus ditolak oleh sistem)"
                    className="px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-colors"
                  >
                    Uji Kode Kadaluarsa
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Sistem menerapkan kebijakan keamanan ketat: Kode kadaluarsa atau dari siklus sebelumnya akan langsung ditolak dan dicatat ke log pelanggaran.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => onCancel('MFA Dibatalkan oleh pengguna')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batalkan Transaksi
              </button>
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleSubmitTotp}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isVerifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Verifikasi &amp; Otorisasi</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Biometric WebAuthn */}
        {activeTab === 'biometric' && (
          <div className="p-6 space-y-6 text-center">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Verifikasi Sidik Jari / Windows Hello / Face ID
              </h3>
              <p className="text-xs text-slate-500">
                Pindai biometrik tersimpan pada perangkat terverifikasi AwanPay Anda.
              </p>
            </div>

            {/* Biometric Scanner Visualizer */}
            <div className="flex flex-col items-center justify-center py-4">
              <button
                onClick={handleSimulateBiometric}
                disabled={biometricScanning || biometricSuccess}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  biometricSuccess
                    ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-600 shadow-md'
                    : biometricScanning
                    ? 'bg-blue-50 border-2 border-blue-500 text-blue-600 animate-pulse'
                    : 'bg-slate-100 border-2 border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-400 cursor-pointer'
                }`}
              >
                {biometricSuccess ? (
                  <Check className="w-10 h-10 text-emerald-600" />
                ) : (
                  <Fingerprint className={`w-10 h-10 ${biometricScanning ? 'scale-110' : ''}`} />
                )}
              </button>

              <span className="text-xs font-semibold text-slate-700 mt-4">
                {biometricSuccess
                  ? 'Biometrik Terverifikasi!'
                  : biometricScanning
                  ? 'Memverifikasi Kunci Kriptografi Perangkat...'
                  : 'Klik sensor biometrik untuk memindai'}
              </span>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Biometric Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleSimulateBiometric}
                disabled={biometricScanning}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                Simulasikan Biometrik Berhasil
              </button>
              <button
                onClick={handleSimulateBiometricFailure}
                disabled={biometricScanning}
                className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors"
              >
                Simulasikan Biometrik Gagal
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => onCancel('MFA Biometrik Dibatalkan oleh pengguna')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg transition-colors"
              >
                Batalkan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
