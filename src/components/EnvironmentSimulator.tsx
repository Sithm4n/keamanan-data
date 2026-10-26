import React from 'react';
import {
  Network,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { SecurityContext, UserRole } from '../types/security';
import {
  OFFICE_SUBNET_CIDR,
  WORK_HOURS_START,
  WORK_HOURS_END,
  DAY_NAMES_ID,
  isIpInSubnet,
  parseTimeToMinutes,
  getCurrentWibContext,
} from '../utils/securityPolicyEngine';

interface EnvironmentSimulatorProps {
  context: SecurityContext;
  setContext: React.Dispatch<React.SetStateAction<SecurityContext>>;
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
}

export const EnvironmentSimulator: React.FC<EnvironmentSimulatorProps> = ({
  context,
  setContext,
  isOpen,
  onClose,
  userRole,
}) => {
  if (!isOpen) return null;

  const isManager = userRole === 'Finance Manager';

  const inSubnet = isIpInSubnet(context.clientIp, OFFICE_SUBNET_CIDR);
  const isWorkday = context.simulatedDay >= 1 && context.simulatedDay <= 5;
  const currentMinutes = parseTimeToMinutes(context.simulatedTime);
  const startMinutes = parseTimeToMinutes(WORK_HOURS_START);
  const endMinutes = parseTimeToMinutes(WORK_HOURS_END);
  const inHours = currentMinutes >= startMinutes && currentMinutes <= endMinutes;

  const handleApplyRealTime = () => {
    const real = getCurrentWibContext();
    setContext((prev) => ({
      ...prev,
      simulatedDay: real.day,
      simulatedTime: real.timeStr,
      useRealTime: true,
    }));
  };

  const setPresetScenario = (type: 'valid' | 'ip_violation' | 'hours_violation' | 'day_violation') => {
    if (type === 'valid') {
      setContext((prev) => ({
        ...prev,
        clientIp: '192.168.10.45',
        simulatedDay: 3, // Rabu
        simulatedTime: '10:30',
        useRealTime: false,
      }));
    } else if (type === 'ip_violation') {
      setContext((prev) => ({
        ...prev,
        clientIp: '114.122.45.10', // Public IP
        simulatedDay: 3, // Rabu
        simulatedTime: '11:15',
        useRealTime: false,
      }));
    } else if (type === 'hours_violation') {
      setContext((prev) => ({
        ...prev,
        clientIp: '192.168.10.45',
        simulatedDay: 2, // Selasa
        simulatedTime: '20:15', // Outside 08:00 - 17:00
        useRealTime: false,
      }));
    } else if (type === 'day_violation') {
      setContext((prev) => ({
        ...prev,
        clientIp: '192.168.10.45',
        simulatedDay: 6, // Sabtu
        simulatedTime: '11:00',
        useRealTime: false,
      }));
    }
  };

  return (
    <div className="bg-slate-100/90 border-b border-slate-200 p-4 sm:p-5 transition-all shadow-xs">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Environment &amp; Attribute Simulator (ABAC Testbed)
              </span>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[11px]">
                Otoritas: Finance Manager
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Kelola parameter jaringan IP dan waktu operasional untuk simulasi kepatuhan aturan ABAC
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isManager && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setPresetScenario('valid')}
                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Kondisi Normal (Semua Valid)
                </button>
                <button
                  onClick={() => setPresetScenario('ip_violation')}
                  className="px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  Uji IP Publik Kafe (Denied)
                </button>
                <button
                  onClick={() => setPresetScenario('hours_violation')}
                  className="px-2.5 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <Clock className="w-3 h-3 text-amber-600" />
                  Uji Malam 20:15 WIB (Denied)
                </button>
                <button
                  onClick={() => setPresetScenario('day_violation')}
                  className="px-2.5 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3 text-amber-600" />
                  Uji Hari Sabtu (Denied)
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              title="Tutup Panel Simulator"
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* If Staff: Access Restricted Guard Banner */}
        {!isManager ? (
          <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">
                Akses Simulator Dibatasi (Khusus Finance Manager)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Anda sedang masuk sebagai <strong>Finance Staff</strong>. Berdasarkan kebijakan keamanan AwanPay, parameter simulasi lingkungan (alamat IP subnet, jam operasional, dan hari transaksi) hanya dapat dimodifikasi oleh pejabat dengan peran <strong>Finance Manager</strong>.
              </p>
              <div className="pt-1 text-xs text-slate-500 font-mono">
                Kondisi saat ini: IP <span className="font-semibold text-slate-800">{context.clientIp}</span> · Waktu: <span className="font-semibold text-slate-800">{context.simulatedTime} WIB</span> ({DAY_NAMES_ID[context.simulatedDay]}).
              </div>
            </div>
          </div>
        ) : (
          /* If Manager: Full Interactive ABAC Parameter Controls */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1: Alamat IP Subnet */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-blue-600" />
                  Alamat IP Klien
                </label>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                    inSubnet
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {inSubnet ? 'Subnet Kantor Valid' : 'Subnet Tidak Sah'}
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={context.clientIp}
                  onChange={(e) =>
                    setContext((prev) => ({ ...prev, clientIp: e.target.value.trim() }))
                  }
                  placeholder="misal 192.168.10.45"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:border-blue-600 focus:bg-white focus:outline-none transition-colors"
                />

                {/* Subnet Presets */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() =>
                      setContext((prev) => ({ ...prev, clientIp: '192.168.10.45' }))
                    }
                    className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                      context.clientIp === '192.168.10.45'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    192.168.10.45 (Kantor)
                  </button>
                  <button
                    onClick={() =>
                      setContext((prev) => ({ ...prev, clientIp: '192.168.10.201' }))
                    }
                    className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                      context.clientIp === '192.168.10.201'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    192.168.10.201 (Server)
                  </button>
                  <button
                    onClick={() =>
                      setContext((prev) => ({ ...prev, clientIp: '114.122.45.10' }))
                    }
                    className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                      context.clientIp === '114.122.45.10'
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    114.122.45.10 (Publik)
                  </button>
                  <button
                    onClick={() =>
                      setContext((prev) => ({ ...prev, clientIp: '180.252.12.9' }))
                    }
                    className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                      context.clientIp === '180.252.12.9'
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    180.252.12.9 (Telkom)
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 pt-1">
                  Aturan ABAC: Wajib berada di subnet kantor{' '}
                  <span className="font-mono text-blue-700 font-semibold">{OFFICE_SUBNET_CIDR}</span>.
                </div>
              </div>
            </div>

            {/* Column 2: Hari Operasional */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Hari Transaksi
                </label>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    isWorkday
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {isWorkday ? 'Hari Kerja Sah' : 'Di Luar Hari Kerja'}
                </span>
              </div>

              <div className="space-y-2">
                <select
                  value={context.simulatedDay}
                  onChange={(e) =>
                    setContext((prev) => ({
                      ...prev,
                      simulatedDay: parseInt(e.target.value, 10),
                      useRealTime: false,
                    }))
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:border-blue-600 focus:bg-white focus:outline-none"
                >
                  <option value={1}>Senin (Hari Kerja)</option>
                  <option value={2}>Selasa (Hari Kerja)</option>
                  <option value={3}>Rabu (Hari Kerja)</option>
                  <option value={4}>Kamis (Hari Kerja)</option>
                  <option value={5}>Jumat (Hari Kerja)</option>
                  <option value={6}>Sabtu (Hari Libur - Pelanggaran ABAC)</option>
                  <option value={0}>Minggu (Hari Libur - Pelanggaran ABAC)</option>
                </select>

                <div className="flex items-center gap-1 flex-wrap">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      onClick={() =>
                        setContext((prev) => ({ ...prev, simulatedDay: d, useRealTime: false }))
                      }
                      className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                        context.simulatedDay === d
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {DAY_NAMES_ID[d]}
                    </button>
                  ))}
                  {[6, 0].map((d) => (
                    <button
                      key={d}
                      onClick={() =>
                        setContext((prev) => ({ ...prev, simulatedDay: d, useRealTime: false }))
                      }
                      className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                        context.simulatedDay === d
                          ? 'bg-rose-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {DAY_NAMES_ID[d]}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-slate-500 pt-1">
                  Aturan ABAC: Transaksi hanya diizinkan pada{' '}
                  <span className="text-blue-700 font-semibold">Senin–Jumat</span>.
                </div>
              </div>
            </div>

            {/* Column 3: Jam Kerja (WIB) */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Waktu Transaksi (WIB)
                </label>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                    inHours
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {inHours ? 'Dalam Jam Kerja' : 'Di Luar Jam Kerja'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={context.simulatedTime}
                    onChange={(e) =>
                      setContext((prev) => ({
                        ...prev,
                        simulatedTime: e.target.value,
                        useRealTime: false,
                      }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:border-blue-600 focus:bg-white focus:outline-none"
                  />
                  <button
                    onClick={handleApplyRealTime}
                    title="Gunakan Jam Realtime Komputer Saat Ini (WIB)"
                    className="px-2.5 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 whitespace-nowrap flex items-center gap-1 transition-colors font-medium"
                  >
                    <RefreshCw className="w-3 h-3 text-blue-600" />
                    <span>Realtime</span>
                  </button>
                </div>

                {/* Time Presets */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() =>
                      setContext((prev) => ({ ...prev, simulatedTime: '09:30', useRealTime: false }))
                    }
                    className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                      context.simulatedTime === '09:30'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    09:30 (Pagi)
                  </button>
                  <button
                    onClick={() =>
                      setContext((prev) => ({ ...prev, simulatedTime: '14:45', useRealTime: false }))
                    }
                    className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                      context.simulatedTime === '14:45'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    14:45 (Siang)
                  </button>
                  <button
                    onClick={() =>
                      setContext((prev) => ({ ...prev, simulatedTime: '16:55', useRealTime: false }))
                    }
                    className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                      context.simulatedTime === '16:55'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    16:55 (Batas Akhir)
                  </button>
                  <button
                    onClick={() =>
                      setContext((prev) => ({ ...prev, simulatedTime: '19:30', useRealTime: false }))
                    }
                    className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                      context.simulatedTime === '19:30'
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    19:30 (Malam - Denied)
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 pt-1">
                  Aturan ABAC: Jam operasional resmi adalah{' '}
                  <span className="font-mono text-blue-700 font-semibold">08:00–17:00 WIB</span>.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
