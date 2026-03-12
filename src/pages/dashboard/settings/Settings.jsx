import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings as SettingsIcon, Users, Mail, Trash2, Plus, Copy, Check, Shield } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import WorkerEarningsWidget from '@/components/finances/WorkerEarningsWidget';

const Settings = () => {
    const { profile, client } = useAuth();
    const [invitations, setInvitations] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState(null);
    const [copiedToken, setCopiedToken] = useState(null);

    const isLeader = profile?.is_client_leader;

    useEffect(() => {
        if (client?.id) {
            fetchTeamData();
        } else {
            setFetching(false);
        }
    }, [client]);

    const fetchTeamData = async () => {
        try {
            setFetching(true);

            // Fetch active team members
            const { data: membersData, error: membersError } = await supabase
                .from('profiles')
                .select('*')
                .eq('client_id', client.id);

            if (membersError) throw membersError;
            setTeamMembers(membersData || []);

            // Fetch pending invitations (Only if leader)
            if (isLeader) {
                const { data: invData, error: invError } = await supabase
                    .from('client_invitations')
                    .select('*')
                    .eq('client_id', client.id);

                if (invError) throw invError;
                setInvitations(invData || []);
            }

        } catch (err) {
            console.error('Error fetching team data:', err);
            setError('Failed to load team data.');
        } finally {
            setFetching(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!newEmail || !newEmail.includes('@')) return;

        try {
            setLoading(true);
            setError(null);

            // Create random token
            const token = crypto.randomUUID();

            const { data, error } = await supabase
                .from('client_invitations')
                .insert([{
                    client_id: client.id,
                    email: newEmail.trim().toLowerCase(),
                    token: token
                }])
                .select()
                .single();

            if (error) {
                if (error.code === '23505') throw new Error('An invitation for this email already exists.');
                throw error;
            }

            setInvitations([...invitations, data]);
            setNewEmail('');

        } catch (err) {
            console.error('Invite error:', err);
            setError(err.message || 'Failed to send invitation.');
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (id) => {
        try {
            const { error } = await supabase
                .from('client_invitations')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setInvitations(invitations.filter(inv => inv.id !== id));
        } catch (err) {
            console.error('Revoke error:', err);
            setError('Failed to revoke invitation.');
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm("Are you sure you want to remove this member from your team?")) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ client_id: null, is_client_leader: false, role: 'client' }) // Need to consider if role changes, keep client for now
                .eq('id', memberId);

            if (error) throw error;
            setTeamMembers(teamMembers.filter(m => m.id !== memberId));
        } catch (err) {
            console.error('Remove error:', err);
            setError('Failed to remove team member.');
        }
    };

    const copyInviteLink = (token) => {
        const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const url = `${baseUrl}/invite?token=${token}`;
        navigator.clipboard.writeText(url);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    if (fetching) {
        return <div className="p-8 text-white font-product animate-pulse">Loading settings...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 font-product text-white">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <SettingsIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    {client && <p className="text-gray-400">{client.name} Workspace</p>}
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
                    {error}
                </div>
            )}

            {['admin', 'worker'].includes(profile?.role) && <WorkerEarningsWidget />}

            {/* TEAM MANAGEMENT SECTION */}
            {client && (
                <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden mb-8">
                    <div className="p-6 border-b border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-green" />
                            <h2 className="text-xl font-bold">Team Members</h2>
                        </div>
                        <p className="text-sm text-gray-400">
                            {isLeader ? "Manage your team members and outgoing invitations." : "View the members of your current workspace."}
                        </p>
                    </div>

                    {isLeader && (
                        <div className="p-6 border-b border-white/10 bg-white/[0.02]">
                            <form onSubmit={handleInvite} className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-400 mb-2 uppercase tracking-wider font-bold">
                                        Invite new member
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="email"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            placeholder="colleague@company.com"
                                            className="w-full bg-black/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-green/50 transition-colors"
                                            required
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !newEmail}
                                    className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-xl font-bold hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                                >
                                    <Plus className="w-4 h-4" />
                                    Send Invite
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="p-6">
                        <div className="space-y-6">
                            {/* Active Members */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Active Members</h3>
                                <div className="space-y-2">
                                    {teamMembers.map(member => (
                                        <div key={member.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green/20 to-blue-500/20 flex items-center justify-center border border-white/10">
                                                    {member.avatar_url ? (
                                                        <img src={member.avatar_url} alt="avatar" className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-bold">{member.full_name?.charAt(0) || member.email?.charAt(0) || '?'}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium flex items-center gap-2">
                                                        {member.full_name || 'Unnamed User'}
                                                        {member.is_client_leader && (
                                                            <span className="flex items-center gap-1 text-[10px] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full font-bold">
                                                                <Shield className="w-3 h-3" /> Leader
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{member.email}</div>
                                                </div>
                                            </div>

                                            {isLeader && !member.is_client_leader && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                    title="Remove member"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pending Invitations */}
                            {isLeader && invitations.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 mt-8">Pending Invitations</h3>
                                    <div className="space-y-2">
                                        {invitations.map(inv => (
                                            <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl gap-3 text-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                                        <Mail className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-300">{inv.email}</div>
                                                        <div className="text-xs text-gray-600">Expires in 7 days</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => copyInviteLink(inv.token)}
                                                        className="flex items-center justify-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
                                                    >
                                                        {copiedToken === inv.token ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
                                                        <span className="text-xs font-bold">{copiedToken === inv.token ? 'Copied' : 'Copy Link'}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleRevoke(inv.id)}
                                                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                        title="Revoke invitation"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
