import { useCallback, useEffect, useState } from 'react';
import { Trash2, Shield } from 'lucide-react';
import { authApi } from '../services/api';
import type { UserRecord, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.getUsers();
      setUsers(res.users);
    } catch (err) {
      showToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (target: UserRecord, newRole: UserRole) => {
    try {
      await authApi.updateUserRole(target.User_ID, newRole);
      showToast(`Updated ${target.Name} to ${newRole}.`, 'success');
      loadUsers();
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await authApi.deleteUser(deleteTarget.User_ID);
      showToast(`Deleted user ${deleteTarget.Name}.`, 'success');
      setDeleteTarget(null);
      loadUsers();
    } catch (err) {
      showToast((err as Error).message, 'error');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div>
          <h2 className="text-base font-display font-semibold">Studio Accounts & Access Control</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage registered users and Administrator privileges
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
          <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          Admin Only
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-right">Reviews</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => {
                  const isSelf = currentUser?.userId === u.User_ID;
                  return (
                    <tr
                      key={u.User_ID}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold">
                        {u.Name}
                        {isSelf && (
                          <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
                            (You)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{u.Email}</td>
                      <td className="py-3 px-3">
                        <select
                          value={u.Role}
                          disabled={isSelf}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 disabled:opacity-60"
                        >
                          <option value="Admin">Admin</option>
                          <option value="User">User</option>
                        </select>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                        {u.Review_Count}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => setDeleteTarget(u)}
                          title={isSelf ? 'Cannot delete active session user' : 'Delete user'}
                          className="p-1.5 rounded-md border border-red-200 dark:border-red-900/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 disabled:opacity-35 disabled:pointer-events-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete User Account"
        message={`Are you sure you want to delete "${deleteTarget?.Name}" (${deleteTarget?.Email})? Users with existing reviews must have their reviews removed first.`}
      />
    </div>
  );
}
