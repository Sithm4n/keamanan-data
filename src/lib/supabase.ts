import { createClient } from '@supabase/supabase-js';
import { AuditLogEntry, UserProfile, UserRole } from '../types/security';

export const DEFAULT_PROJECT_REF = 'fefckqapttnkgwwvwyyv';
export const DEFAULT_SUPABASE_URL = `https://${DEFAULT_PROJECT_REF}.supabase.co`;
export const DEFAULT_ANON_KEY = 'sb_publishable_CnMbgg1LC6TVshbPrm4-5Q_Wgg2eiwL';

export const SUPABASE_PROJECT_REF = DEFAULT_PROJECT_REF;
export const SUPABASE_URL = DEFAULT_SUPABASE_URL;

export function getSupabaseConfig() {
  const customUrl = localStorage.getItem('AWANPAY_SUPABASE_URL');
  const customKey = localStorage.getItem('AWANPAY_SUPABASE_KEY');

  // If old typo URL was stored in localStorage, reset it to new correct URL
  if (customUrl && customUrl.includes('fefckqapttnkgwwwvyyv')) {
    localStorage.removeItem('AWANPAY_SUPABASE_URL');
    localStorage.removeItem('AWANPAY_SUPABASE_KEY');
  }

  return {
    url: customUrl && !customUrl.includes('fefckqapttnkgwwwvyyv') ? customUrl.trim() : DEFAULT_SUPABASE_URL,
    key: customKey ? customKey.trim() : DEFAULT_ANON_KEY,
  };
}


export function saveSupabaseConfig(url: string, key: string) {
  if (url.trim()) localStorage.setItem('AWANPAY_SUPABASE_URL', url.trim());
  if (key.trim()) localStorage.setItem('AWANPAY_SUPABASE_KEY', key.trim());
  supabase = createClient(getSupabaseConfig().url, getSupabaseConfig().key);
}

export function resetSupabaseConfig() {
  localStorage.removeItem('AWANPAY_SUPABASE_URL');
  localStorage.removeItem('AWANPAY_SUPABASE_KEY');
  supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_ANON_KEY);
}

export let supabase = createClient(getSupabaseConfig().url, getSupabaseConfig().key);


export interface SupabaseSyncResult {
  success: boolean;
  message: string;
  tableExists?: boolean;
  rowCount?: number;
  usersTableExists?: boolean;
  usersRowCount?: number;
}

/**
 * Health check test for Supabase connection & check both tables (transactions and users)
 */
export async function testSupabaseConnection(): Promise<SupabaseSyncResult> {
  try {
    const [txRes, usersRes] = await Promise.all([
      supabase.from('transactions').select('id, reference_no', { count: 'exact' }).limit(1),
      supabase.from('users').select('id, username', { count: 'exact' }).limit(1),
    ]);

    const txExists = !txRes.error || txRes.error.code !== '42P01';
    const usersExists = !usersRes.error || usersRes.error.code !== '42P01';

    const txCount = txRes.count ?? (txRes.data?.length ?? 0);
    const usersCount = usersRes.count ?? (usersRes.data?.length ?? 0);

    const isConnected = !txRes.error || txRes.error.code === '42P01';

    if (!isConnected && (!usersRes.error || usersRes.error.code === '42P01')) {
      // General error
      return {
        success: false,
        tableExists: false,
        usersTableExists: false,
        message: txRes.error ? `Error Supabase (${txRes.error.code}): ${txRes.error.message}` : 'Gagal menghubungi Supabase.',
      };
    }

    return {
      success: true,
      tableExists: txExists,
      rowCount: txCount,
      usersTableExists: usersExists,
      usersRowCount: usersCount,
      message: `Koneksi Supabase aktif! [Tabel transactions: ${txExists ? 'Siap (' + txCount + ' data)' : 'Belum dibuat'}] · [Tabel users: ${usersExists ? 'Siap (' + usersCount + ' akun)' : 'Belum dibuat'}]`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const isFetchError = errorMsg.includes('Failed to fetch') || errorMsg.includes('fetch failed');
    return {
      success: false,
      tableExists: false,
      usersTableExists: false,
      message: isFetchError
        ? `Domain https://${SUPABASE_PROJECT_REF}.supabase.co tidak dapat dihubungi (Failed to fetch). Periksa Project URL di menu Settings > API atau pastikan project tidak dalam status Paused.`
        : `Gagal menghubungi Supabase: ${errorMsg}`,
    };
  }
}

/**
 * Sync single transaction & audit log entry to Supabase
 */
export async function pushTransactionToSupabase(log: AuditLogEntry): Promise<SupabaseSyncResult> {
  try {
    const payload = {
      reference_no: log.referenceNo,
      actor_username: log.actor.username,
      actor_name: log.actor.fullName,
      actor_role: log.actor.role,
      recipient_name: log.transaction.recipientName,
      recipient_account: log.transaction.recipientAccount,
      bank_name: log.transaction.bankName,
      amount: log.transaction.amount,
      department: log.transaction.department,
      description: log.transaction.description,
      status: log.status,
      mfa_status: log.mfaStatus,
      mfa_method: log.mfaMethod || null,
      client_ip: log.contextSnapshot.ip,
      primary_reason: log.primaryReason,
      detailed_violations: log.detailedViolations,
      escalated_to_manager: log.escalatedToManager || false,
      manager_decided_by: log.managerDecision?.decidedBy || null,
      manager_decided_at: log.managerDecision ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
    };

    // First attempt to insert
    const insertRes = await supabase.from('transactions').insert(payload);

    if (insertRes.error) {
      // If reference_no already exists (error 23505), update it instead
      if (insertRes.error.code === '23505') {
        const updateRes = await supabase
          .from('transactions')
          .update(payload)
          .eq('reference_no', log.referenceNo);

        if (updateRes.error) {
          return {
            success: false,
            message: `Gagal update: ${updateRes.error.message}`,
          };
        }
        return {
          success: true,
          tableExists: true,
          message: `Berhasil diperbarui di Supabase (${log.referenceNo})`,
        };
      }

      return {
        success: false,
        message: `Gagal insert (${insertRes.error.code}): ${insertRes.error.message}. Periksa RLS Policy Anda.`,
      };
    }

    return {
      success: true,
      tableExists: true,
      message: `Tersimpan ke Supabase (${log.referenceNo})`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const isFetchError = errorMsg.includes('Failed to fetch') || errorMsg.includes('fetch failed');
    return {
      success: false,
      message: isFetchError
        ? `Gagal terhubung (Failed to fetch). Domain ${SUPABASE_PROJECT_REF}.supabase.co tidak dapat dihubungi. Periksa Project URL di Settings > API atau status proyek di Supabase.`
        : `Error pengiriman: ${errorMsg}`,
    };
  }
}

/**
 * Bulk sync all existing audit logs from the web app to Supabase
 */
export async function syncAllLogsToSupabase(logs: AuditLogEntry[]): Promise<{
  success: boolean;
  syncedCount: number;
  message: string;
  errors: string[];
}> {
  let synced = 0;
  const errors: string[] = [];

  for (const log of logs) {
    const res = await pushTransactionToSupabase(log);
    if (res.success) {
      synced++;
    } else {
      errors.push(`${log.referenceNo}: ${res.message}`);
    }
  }

  return {
    success: synced > 0,
    syncedCount: synced,
    message:
      synced > 0
        ? `Berhasil mengirim ${synced} dari ${logs.length} data transaksi ke tabel Supabase!`
        : `Gagal mengirim data. Penyebab: ${errors[0] || 'Periksa RLS Policy di Supabase'}`,
    errors,
  };
}

/**
 * Update transaction decision in Supabase
 */
export async function updateDecisionInSupabase(
  referenceNo: string,
  decision: 'APPROVED' | 'DENIED',
  decidedBy: string,
  primaryReason: string
): Promise<SupabaseSyncResult> {
  try {
    const { error } = await supabase
      .from('transactions')
      .update({
        status: decision,
        primary_reason: primaryReason,
        manager_decided_by: decidedBy,
        manager_decided_at: new Date().toISOString(),
      })
      .eq('reference_no', referenceNo);

    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: `Status diperbarui di Supabase: ${decision}` };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: errorMsg };
  }
}

/**
 * Fetch all registered users/accounts from Supabase public.users
 */
export async function fetchUsersFromSupabase(): Promise<{
  success: boolean;
  users: UserProfile[];
  message: string;
  tableExists: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          tableExists: false,
          users: [],
          message: 'Tabel `public.users` belum dibuat di Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        tableExists: false,
        users: [],
        message: `Error Supabase (${error.code}): ${error.message}`,
      };
    }

    const mappedUsers: UserProfile[] = (data || []).map((row) => ({
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      email: row.email,
      role: row.role as UserRole,
      employeeId: row.employee_id,
      department: row.department,
      password: row.password || 'staff123',
      avatarUrl: row.avatar_url || undefined,
    }));

    return {
      success: true,
      tableExists: true,
      users: mappedUsers,
      message: `Berhasil memuat ${mappedUsers.length} akun terdaftar dari Supabase.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      tableExists: false,
      users: [],
      message: `Gagal memuat akun: ${errorMsg}`,
    };
  }
}

/**
 * Save / Upsert a single registered user into Supabase public.users
 */
export async function saveUserToSupabase(user: UserProfile): Promise<SupabaseSyncResult> {
  try {
    const payload = {
      id: user.id,
      username: user.username,
      full_name: user.fullName,
      email: user.email,
      role: user.role,
      employee_id: user.employeeId,
      department: user.department,
      password: user.password || 'staff123',
      avatar_url: user.avatarUrl || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'username' });

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          tableExists: false,
          message: 'Tabel `public.users` belum dibuat di Supabase. Jalankan skrip SQL di menu Supabase.',
        };
      }
      return {
        success: false,
        tableExists: true,
        message: `Gagal menyimpan akun ke Supabase (${error.code}): ${error.message}`,
      };
    }

    return {
      success: true,
      tableExists: true,
      message: `Akun '${user.fullName}' (${user.username}) berhasil disimpan ke Supabase!`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Gagal menyimpan akun: ${errorMsg}`,
    };
  }
}

/**
 * Delete a user from Supabase public.users
 */
export async function deleteUserFromSupabase(userId: string): Promise<SupabaseSyncResult> {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      return {
        success: false,
        message: `Gagal menghapus akun di Supabase: ${error.message}`,
      };
    }

    return {
      success: true,
      tableExists: true,
      message: `Akun berhasil dihapus dari tabel public.users di Supabase.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Gagal menghapus: ${errorMsg}`,
    };
  }
}

/**
 * Seed all current app users to Supabase public.users
 */
export async function seedUsersToSupabase(users: UserProfile[]): Promise<SupabaseSyncResult> {
  try {
    const payloads = users.map((u) => ({
      id: u.id,
      username: u.username,
      full_name: u.fullName,
      email: u.email,
      role: u.role,
      employee_id: u.employeeId,
      department: u.department,
      password: u.password || 'staff123',
      avatar_url: u.avatarUrl || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('users')
      .upsert(payloads, { onConflict: 'username' });

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          tableExists: false,
          message: 'Tabel `public.users` belum dibuat di Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        tableExists: true,
        message: `Gagal seeding akun: ${error.message}`,
      };
    }

    return {
      success: true,
      tableExists: true,
      rowCount: users.length,
      message: `Berhasil menyinkronkan ${users.length} akun ke tabel public.users Supabase!`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Error: ${errorMsg}`,
    };
  }
}

/**
 * Convert a Supabase database row to an AuditLogEntry
 */
export function mapRowToAuditLog(row: any): AuditLogEntry {
  const createdAtDate = row.created_at ? new Date(row.created_at) : new Date();
  const timeFormatted = `${createdAtDate.toLocaleDateString('id-ID')} ${createdAtDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })} WIB`;

  return {
    id: row.id ? String(row.id) : `LOG-${row.reference_no}`,
    referenceNo: row.reference_no || 'TRX-UNKNOWN',
    timestamp: timeFormatted,
    actor: {
      id: row.actor_username || 'usr-remote',
      username: row.actor_username || 'unknown',
      fullName: row.actor_name || row.actor_username || 'Pengguna',
      role: (row.actor_role as UserRole) || 'Finance Staff',
      ip: row.client_ip || '192.168.10.45',
    },
    transaction: {
      recipientName: row.recipient_name || 'Rekening Operasional',
      recipientAccount: row.recipient_account || '-',
      bankName: row.bank_name || 'Bank',
      amount: Number(row.amount) || 0,
      department: row.department || 'Operations',
      description: row.description || '',
    },
    status: (row.status as 'APPROVED' | 'DENIED' | 'PENDING') || 'PENDING',
    mfaStatus: (row.mfa_status as any) || 'VERIFIED',
    mfaMethod: row.mfa_method || undefined,
    rbacPassed: true,
    abacPassed: row.status === 'APPROVED',
    primaryReason:
      row.primary_reason ||
      (row.status === 'APPROVED'
        ? 'Otorisasi Berhasil: Lolos validasi kebijakan keamanan.'
        : row.status === 'PENDING'
        ? 'Memerlukan Approval: Nominal transaksi melebihi limit staf.'
        : 'Ditolak: Pelanggaran kebijakan keamanan.'),
    detailedViolations: Array.isArray(row.detailed_violations) ? row.detailed_violations : [],
    escalatedToManager: Boolean(row.escalated_to_manager),
    managerDecision: row.manager_decided_by
      ? {
          decidedBy: row.manager_decided_by,
          decidedAt: row.manager_decided_at || new Date().toISOString(),
          decision: (row.status as 'APPROVED' | 'DENIED') || 'APPROVED',
          notes: row.primary_reason,
        }
      : undefined,
    contextSnapshot: {
      ip: row.client_ip || '192.168.10.45',
      dayName: 'Hari Kerja',
      timeWib: createdAtDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      allowedSubnet: '192.168.10.0/24',
      allowedHours: '08:00–17:00 WIB',
      roleLimit: row.actor_role === 'Finance Manager' ? 1000000000 : 50000000,
    },
  };
}

/**
 * Fetch all transactions from Supabase public.transactions
 */
export async function fetchTransactionsFromSupabase(): Promise<{
  success: boolean;
  transactions: AuditLogEntry[];
  message: string;
  tableExists: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          tableExists: false,
          transactions: [],
          message: 'Tabel `public.transactions` belum dibuat di Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        tableExists: false,
        transactions: [],
        message: `Error Supabase (${error.code}): ${error.message}`,
      };
    }

    const mapped = (data || []).map(mapRowToAuditLog);
    return {
      success: true,
      tableExists: true,
      transactions: mapped,
      message: `Berhasil memuat ${mapped.length} data transaksi dari Supabase.`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      tableExists: false,
      transactions: [],
      message: `Gagal memuat transaksi: ${errorMsg}`,
    };
  }
}

/**
 * Subscribe to realtime changes on transactions table with fallback support
 */
export function subscribeToTransactions(
  onChanged: (entry: AuditLogEntry, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
) {
  try {
    const channel = supabase
      .channel('realtime_public_transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const mapped = mapRowToAuditLog(payload.new);
            onChanged(mapped, payload.eventType);
          } else if (payload.eventType === 'DELETE') {
            const dummyEntry: any = {
              id: payload.old?.id || '',
              referenceNo: payload.old?.reference_no || '',
            };
            onChanged(dummyEntry, 'DELETE');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription not available:', err);
    return () => {};
  }
}

