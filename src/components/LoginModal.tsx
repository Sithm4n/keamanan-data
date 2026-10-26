import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  ArrowRight,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  Clock,
  Check,
  Copy,
  Info,
} from 'lucide-react';
import { UserProfile } from '../types/security';
import { generateLiveTotp, verifyTotpCode } from '../utils/totpGenerator';

interface LoginModalProps {
  users: UserProfile[];
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ users, onLoginSuccess }) => {
  const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
  const [username, setUsername] = useState('naja');
  const [password, setPassword] = useState('staff123');
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // TOTP State for Step 2
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [liveToken, setLiveToken] = useState(() => generateLiveTotp());
  const [copiedCode, setCopiedCode] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update rolling token every second
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveToken(generateLiveTotp());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Step 1: Validate Username & Password
  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    const matchedUser = users.find(
      (u) =>
        u.username.toLowerCase() === cleanUsername &&
        (u.password ? u.password === cleanPassword : cleanPassword === 'staff123' || cleanPassword === 'manager123')
    );

    if (matchedUser) {
      setPendingUser(matchedUser);
      setStep('totp');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } else {
      setErrorMsg('Username atau kata sandi tidak valid. Pastikan kredensial benar.');
    }
  };

  // Step 2: Handle TOTP digit input
  const handleDigitChange = (index: number, val: string) => {
    setErrorMsg(null);
    const cleaned = val.replace(/\D/g, '');

    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    if (cleaned.length === 1) {
      const next = [...digits];
      next[index] = cleaned;
      setDigits(next);
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
      return;
    }

    // Pasted code
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
      handleTotpSubmit();
    }
  };

  // Verify TOTP on Login
  const handleTotpSubmit = () => {
    const fullCode = digits.join('');
    if (fullCode.length !== 6) {
      setErrorMsg('Masukkan 6-digit kode TOTP authenticator lengkap.');
      return;
    }

    const result = verifyTotpCode(fullCode);
    if (result.isValid && pendingUser) {
      onLoginSuccess(pendingUser);
    } else {
      setErrorMsg(result.reason || 'Kode TOTP salah atau telah kadaluarsa.');
    }
  };

  const handleAutofillToken = () => {
    const valid = liveToken.code.split('');
    setDigits(valid);
    setErrorMsg(null);
    inputRefs.current[5]?.focus();
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(liveToken.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-lg p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            AwanPay Corporate Portal
          </h1>
          <p className="text-xs text-slate-500">
            Sistem Autentikasi Berlapis Dompet Digital Korporat
          </p>
        </div>

        {/* STEP 1: Username & Password Login */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                Username Korporat
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="misal: naja atau najwa"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Kata Sandi
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                required
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Lanjut ke Verifikasi Authenticator</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Test Credentials Helper Note (Clean & Subtle, no bypass) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 space-y-1">
              <div className="flex items-center gap-1 font-bold text-slate-700">
                <Info className="w-3 h-3 text-blue-600" />
                Kredensial Akun Default:
              </div>
              <div className="font-mono text-slate-600">
                • Finance Staff: <span className="font-bold text-slate-800">naja</span> / <span className="font-bold text-slate-800">staff123</span>
              </div>
              <div className="font-mono text-slate-600">
                • Finance Manager: <span className="font-bold text-slate-800">najwa</span> / <span className="font-bold text-slate-800">manager123</span>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2: Authenticator TOTP Verification */}
        {step === 'totp' && (
          <div className="space-y-5">
            {/* User Target Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Autentikasi Akun</span>
                <span className="text-xs font-bold text-slate-900">{pendingUser?.fullName}</span>
                <span className="font-mono text-[10px] text-blue-700 block font-bold">
                  {pendingUser?.role}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setErrorMsg(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-3 h-3" />
                Ganti
              </button>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900 flex items-center justify-center gap-1.5">
                <KeyRound className="w-4 h-4 text-blue-600" />
                Masukkan Kode Authenticator (MFA)
              </h3>
              <p className="text-xs text-slate-500">
                Buka aplikasi TOTP / Authenticator AwanPay dan masukkan 6-digit kode aktif:
              </p>
            </div>

            {/* 6 Digit Inputs */}
            <div className="flex justify-center gap-2 sm:gap-2.5">
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
                  className={`w-11 h-13 text-center text-xl font-mono font-bold rounded-xl border transition-all focus:outline-none ${
                    errorMsg
                      ? 'border-rose-400 bg-rose-50 text-rose-800'
                      : digit
                      ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-xs'
                      : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-blue-600 focus:bg-white'
                  }`}
                />
              ))}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Live Virtual Token Assistant for Prototype */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Simulator Token Perangkat:
                </span>
                <span className="font-mono text-blue-700 text-[11px] font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-500" />
                  {liveToken.remainingSeconds}s
                </span>
              </div>

              <div className="flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-xs">
                <div className="flex items-center gap-2 font-mono text-base font-bold text-slate-900">
                  <span>{liveToken.code.slice(0, 3)} {liveToken.code.slice(3)}</span>
                  <button
                    onClick={handleCopyToken}
                    title="Salin Kode"
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAutofillToken}
                  className="px-2.5 py-1 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                >
                  Gunakan Kode
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleTotpSubmit}
              className="w-full py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Verifikasi &amp; Masuk ke Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="pt-2 text-center text-[11px] text-slate-500 font-mono">
          AwanPay Security Protocol · Enforced 2FA Access
        </div>
      </div>
    </div>
  );
};
