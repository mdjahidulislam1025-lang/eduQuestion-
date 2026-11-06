import React, { useState } from 'react';
import {
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
  UserRole,
  ActivityLogRecord
} from '../types';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Key,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  Copy,
  History,
  Lock,
  ArrowRight
} from 'lucide-react';

interface WorkspaceMembersViewProps {
  workspace: Workspace;
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  activityLogs: ActivityLogRecord[];
  currentUserRole: UserRole;
  currentUserId: string;
  onInviteMember: (email: string, role: 'ADMIN' | 'EDITOR' | 'VIEWER') => void;
  onChangeRole: (memberId: string, newRole: UserRole) => void;
  onRemoveMember: (memberId: string) => void;
  onTransferOwnership: (targetUserId: string) => void;
  isBangla?: boolean;
}

export const WorkspaceMembersView: React.FC<WorkspaceMembersViewProps> = ({
  workspace,
  members,
  invitations,
  activityLogs,
  currentUserRole,
  currentUserId,
  onInviteMember,
  onChangeRole,
  onRemoveMember,
  onTransferOwnership,
  isBangla = false,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'audit' | 'roles'>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Transfer Ownership Modal State
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [transferConfirmText, setTransferConfirmText] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);

  const canManageMembers = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  const isOwner = currentUserRole === 'OWNER';

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    onInviteMember(inviteEmail.trim().toLowerCase(), inviteRole);
    setInviteEmail('');
  };

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}?invite=${token}`);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const executeTransferOwnership = () => {
    if (transferConfirmText !== 'TRANSFER' || !transferTargetId) return;
    onTransferOwnership(transferTargetId);
    setShowTransferModal(false);
    setTransferConfirmText('');
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            {isBangla ? 'মালিক (Owner)' : 'Workspace Owner'}
          </span>
        );
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            {isBangla ? 'অ্যাডমিন (Admin)' : 'Administrator'}
          </span>
        );
      case 'EDITOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            {isBangla ? 'সম্পাদক (Editor)' : 'Content Editor'}
          </span>
        );
      case 'VIEWER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
            {isBangla ? 'পাঠক (Viewer)' : 'Read-Only Viewer'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              {workspace.name}
            </h2>
            {getRoleBadge(currentUserRole)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isBangla
              ? 'নিরাপদ ওয়ার্কস্পেস ও বহু-ব্যবহারকারী ভূমিকাভিত্তিক অ্যাক্সেস নিয়ন্ত্রণ (RBAC)'
              : 'Multi-User Workspace & Role-Based Access Control (RBAC)'} • {members.length} {isBangla ? 'জন সদস্য' : 'Active Members'}
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-3.5 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            {isBangla ? 'মালিকানা হস্তান্তর করুন' : 'Transfer Ownership'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'members'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> {isBangla ? 'সদস্য তালিকা' : 'Active Members'} ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'invitations'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserPlus className="w-4 h-4" /> {isBangla ? 'আমন্ত্রণ ও লিংক' : 'Invitations'} ({invitations.filter((i) => i.status === 'PENDING').length})
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'roles'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" /> {isBangla ? 'অনুমতি নীতিমালা' : 'Role Permissions Matrix'}
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" /> {isBangla ? 'অডিট লগ' : 'Activity Audit Log'}
        </button>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Invite Box (For Owner/Admin) */}
          {canManageMembers && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                {isBangla ? 'নতুন সদস্য আমন্ত্রণ করুন' : 'Invite Authorized Team Member'}
              </h3>
              <form onSubmit={handleSendInvite} className="flex flex-wrap items-center gap-3">
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="collaborator@school.edu.bd"
                  className="flex-1 min-w-[240px] text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500"
                />

                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="text-xs border border-slate-300 rounded-xl p-2.5 bg-white font-bold text-slate-700"
                >
                  <option value="EDITOR">Content Editor (প্রশ্ন ও পরীক্ষা পত্র প্রস্তুত)</option>
                  <option value="ADMIN">Administrator (ম্যানেজমেন্ট ও সদস্য নিয়ন্ত্রণ)</option>
                  <option value="VIEWER">Read-Only Viewer (শুধুমাত্র দেখা)</option>
                </select>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isBangla ? 'আমন্ত্রণ পাঠান' : 'Send Invite'}
                </button>
              </form>
            </div>
          )}

          {/* Members Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-3.5">User / Member</th>
                    <th className="px-6 py-3.5">Assigned Role</th>
                    <th className="px-6 py-3.5">Joined Date</th>
                    {canManageMembers && <th className="px-6 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((member) => {
                    const isSelf = member.userId === currentUserId;
                    const isTargetOwner = member.role === 'OWNER';

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{member.displayName}</div>
                          <div className="text-slate-500 text-[11px]">{member.userEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          {canManageMembers && !isTargetOwner && !isSelf ? (
                            <select
                              value={member.role}
                              onChange={(e) => onChangeRole(member.id, e.target.value as UserRole)}
                              className="text-xs border border-slate-300 rounded-lg p-1.5 bg-white font-semibold text-slate-800"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="EDITOR">EDITOR</option>
                              <option value="VIEWER">VIEWER</option>
                            </select>
                          ) : (
                            getRoleBadge(member.role)
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(member.createdAt).toLocaleDateString()}
                        </td>
                        {canManageMembers && (
                          <td className="px-6 py-4 text-right">
                            {!isTargetOwner && !isSelf && (
                              <button
                                onClick={() => onRemoveMember(member.id)}
                                title="Remove member"
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <div className="space-y-4">
          {invitations.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No pending invitations. Click "Invite Authorized Team Member" above to invite collaborators.
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{inv.email}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {inv.role}
                      </span>
                      <span>•</span>
                      <span>Expires: {new Date(inv.expiresAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="text-amber-600 font-semibold">{inv.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(inv.token)}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      {copiedToken === inv.token ? 'Link Copied!' : 'Copy Direct Invite Link'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Role Matrix Tab */}
      {activeTab === 'roles' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 text-base">Role-Based Access Control (RBAC) Governance</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
              <span className="font-bold text-amber-900 text-sm block">1. OWNER</span>
              <p className="text-slate-600">
                Absolute sovereignty. Can transfer ownership, invite/remove admins and members, manage branding, and configure Firebase workspace settings. Protected from deletion.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
              <span className="font-bold text-blue-900 text-sm block">2. ADMIN</span>
              <p className="text-slate-600">
                Team administration. Can invite editors and viewers, manage all textbooks, questions, and examination papers. Cannot remove or transfer the Owner.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
              <span className="font-bold text-emerald-900 text-sm block">3. EDITOR</span>
              <p className="text-slate-600">
                Academic authoring. Can generate MCQ/SQ/CQ questions with Gemini AI, upload NCTB textbooks and board question archives, and build exam papers.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-bold text-slate-800 text-sm block">4. VIEWER</span>
              <p className="text-slate-600">
                Student or reviewer access. Can inspect permitted question banks, verified board archives, and preview examination papers. Cannot modify or delete data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" /> Immutable Workspace Audit Trail
          </h3>

          {activityLogs.length === 0 ? (
            <p className="text-xs text-slate-400">No activity logged yet.</p>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {activityLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{log.action}: </span>
                    <span className="text-slate-600">{log.details}</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">By {log.userEmail}</div>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap ml-4">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ownership Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-300 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-700">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">Transfer Workspace Ownership</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              WARNING: Transferring ownership will demote your account to an Administrator and grant full sovereignty to the selected member. This action cannot be undone.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select New Owner:</label>
              <select
                value={transferTargetId}
                onChange={(e) => setTransferTargetId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white font-semibold"
              >
                <option value="">Select a member...</option>
                {members
                  .filter((m) => m.userId !== currentUserId)
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName} ({m.userEmail})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Type <strong>TRANSFER</strong> to confirm:
              </label>
              <input
                type="text"
                value={transferConfirmText}
                onChange={(e) => setTransferConfirmText(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 uppercase font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={executeTransferOwnership}
                disabled={transferConfirmText !== 'TRANSFER' || !transferTargetId}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Confirm Ownership Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
