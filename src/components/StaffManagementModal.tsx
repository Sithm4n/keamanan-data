import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Building,
  BadgeCheck,
} from 'lucide-react';
import { UserProfile } from '../types/security';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  onAddStaff: (newStaff: UserProfile) => void;
  onDeleteStaff: (staffId: string) => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  onAddStaff,
  onDeleteStaff,
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [department, setDepartment] = useState('Treasury & Disbursement Operations');
  const [password, setPassword] = useState('staff123');
  const [employeeId, setEmployeeId] = useState(`AWN-STF-${Math.floor(100 + Math.random() * 900)}`);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const staffMembers = users.filter((u) => u.role === 'Finance Staff');

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !fullName.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Nama lengkap dan username wajib diisi.' });
      return;
    }

    // Check duplicate username
    if (users.some((u) => u.username.toLowerCase() === cleanUser)) {
      setFeedbackMsg({ type: 'error', text: `Username '${cleanUser}' sudah digunakan.` });
      return;
    }

    const newStaff: UserProfile = {
      id: `usr_staff_${Date.now()}`,
      username: cleanUser,
      fullName: fullName.trim(),
      email: `${cleanUser}@awanpay.corp`,
      role: 'Finance Staff',
      employeeId: employeeId.trim() || `AWN-STF-${Math.floor(100 + Math.random() * 900)}`,
      department,
      password: password || 'staff123',
    };

    onAddStaff(newStaff);
    setFeedbackMsg({ type: 'success', text: `Akun Finance Staff '${newStaff.fullName}' (${newStaff.username}) berhasil ditambahkan.` });

    // Reset form
    setFullName('');
    setUsername('');
    setEmployeeId(`AWN-STF-${Math.floor(100 + Math.random() * 900)}`);
    setPassword('staff123');
  };

  const handleDelete = (id: string, name: string) => {
    if (staffMembers.length <= 1) {
      setFeedbackMsg({ type: 'error', text: 'Minimal harus ada 1 akun Finance Staff di dalam sistem.' });
      return;
    }
    onDeleteStaff(id);
    setFeedbackMsg({ type: 'success', text: `Akun '${name}' berhasil dihapus dari sistem.` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Manajemen Akun Finance Staff
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Wewenang Manager
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Supabase public.users
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola pendaftaran, penambahan, dan penghapusan staf operasional dompet digital
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Feedback banner */}
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Form to Add Staff */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-600" />
              Tambah Akun Finance Staff Baru
            </h4>

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Nama Lengkap</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Rian Pratama"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Username Login</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: rian"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">ID Karyawan</label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Departemen</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Daftarkan Staff Baru</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Existing Staff Members */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Daftar Akun Finance Staff Terdaftar ({staffMembers.length})</span>
              <span className="text-[11px] text-slate-500 font-sans font-normal">
                Limit nominal otomatis: Maks. Rp50.000.000
              </span>
            </h4>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              {staffMembers.map((staff) => (
                <div
                  key={staff.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-xs font-mono">
                      {staff.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{staff.fullName}</span>
                        <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {staff.employeeId}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">User: {staff.username}</span>
                        <span>·</span>
                        <span>{staff.department}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                      Pass: {staff.password || 'staff123'}
                    </span>
                    <button
                      onClick={() => handleDelete(staff.id, staff.fullName)}
                      title="Hapus akun staf ini"
                      className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Sistem Hak Akses RBAC AwanPay · Manajemen Pengguna
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
