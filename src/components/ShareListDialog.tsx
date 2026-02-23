import { useState, useEffect } from 'react';
import { supabase, ListMember, UserProfile, ListInviteLink } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Share2, Search, Copy, Check, Trash2, Link2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';

type MemberWithProfile = ListMember & {
  profile?: UserProfile;
};

interface ShareListDialogProps {
  listId: string;
  listName: string;
}

export function ShareListDialog({ listId, listName }: ShareListDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<ListInviteLink[]>([]);
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [newInviteRole, setNewInviteRole] = useState<'view' | 'edit' | 'admin'>('view');
  const [copiedInviteToken, setCopiedInviteToken] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchMembers();
      fetchInviteLinks();
    }
  }, [open, listId]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    setSearching(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-users?q=${encodeURIComponent(searchQuery)}`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      const existingMemberIds = new Set(members.map(m => m.user_id));
      setSearchResults(data.users.filter((u: UserProfile) => !existingMemberIds.has(u.id)));
    } catch (error) {
      toast.error('Failed to search users');
      console.error(error);
    } finally {
      setSearching(false);
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('list_members')
        .select('*')
        .eq('list_id', listId);

      if (error) throw error;

      const memberIds = data?.map(m => m.user_id) || [];
      if (memberIds.length === 0) {
        setMembers([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', memberIds);

      if (profilesError) throw profilesError;

      const membersWithProfiles = (data || []).map(member => ({
        ...member,
        profile: profiles?.find(p => p.id === member.user_id),
      }));

      setMembers(membersWithProfiles);
    } catch (error) {
      toast.error('Failed to load members');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (userId: string, role: 'view' | 'edit' | 'admin') => {
    try {
      const { error } = await supabase
        .from('list_members')
        .insert([
          {
            list_id: listId,
            user_id: userId,
            role,
            invited_by: user!.id,
          },
        ]);

      if (error) throw error;

      toast.success('User added successfully');
      setSearchQuery('');
      setSearchResults([]);
      fetchMembers();
    } catch (error) {
      toast.error('Failed to add user');
      console.error(error);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'view' | 'edit' | 'admin') => {
    setMembers(prevMembers =>
      prevMembers.map(m => m.id === memberId ? { ...m, role: newRole } : m)
    );

    try {
      const { error } = await supabase
        .from('list_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Role updated successfully');
    } catch (error) {
      toast.error('Failed to update role');
      console.error(error);
      fetchMembers();
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('list_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('User removed successfully');
      fetchMembers();
    } catch (error) {
      toast.error('Failed to remove user');
      console.error(error);
    }
  };

  const fetchInviteLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('list_invite_links')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInviteLinks(data || []);
    } catch (error) {
      console.error('Failed to fetch invite links:', error);
    }
  };

  const createInviteLink = async () => {
    try {
      const { error } = await supabase
        .from('list_invite_links')
        .insert([
          {
            list_id: listId,
            created_by: user!.id,
            role: newInviteRole,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast.success('Invite link created');
      setShowCreateInvite(false);
      fetchInviteLinks();
    } catch (error) {
      toast.error('Failed to create invite link');
      console.error(error);
    }
  };

  const deleteInviteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('list_invite_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast.success('Invite link deleted');
      fetchInviteLinks();
    } catch (error) {
      toast.error('Failed to delete invite link');
      console.error(error);
    }
  };

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInviteToken(token);
    toast.success('Invite link copied to clipboard');
    setTimeout(() => setCopiedInviteToken(null), 2000);
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/list/${listId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share "{listName}"</DialogTitle>
          <DialogDescription>
            Invite people to collaborate on this list or copy the link to share.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Share Link</Label>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/list/${listId}`}
                readOnly
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={copyShareLink}>
                {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link and the appropriate permissions can view the list.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Add People</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {searching && (
              <p className="text-sm text-muted-foreground">Searching...</p>
            )}

            {searchResults.length > 0 && (
              <div className="border rounded-md divide-y">
                {searchResults.map((profile) => (
                  <div key={profile.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{profile.username || 'No username'}</p>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addMember(profile.id, 'view')}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
              <div className="text-sm text-muted-foreground p-4 border rounded-md">
                <p>No users found. Create an invite link below to share with new users.</p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Invite Links</Label>
              {!showCreateInvite && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateInvite(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Link
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Create invite links for users who don't have an account yet. They'll be added to the list when they sign up using the link.
            </p>

            {showCreateInvite && (
              <div className="border rounded-md p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Select
                    value={newInviteRole}
                    onValueChange={(role) => setNewInviteRole(role as 'view' | 'edit' | 'admin')}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={createInviteLink} size="sm">
                    Create Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateInvite(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {inviteLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invite links created yet.</p>
            ) : (
              <div className="border rounded-md divide-y">
                {inviteLinks.map((link) => (
                  <div key={link.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium capitalize">{link.role} Access</span>
                        <span className="text-xs text-muted-foreground">
                          ({link.used_count} use{link.used_count !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(link.token)}
                        >
                          {copiedInviteToken === link.token ? (
                            <Check className="h-4 w-4 mr-2" />
                          ) : (
                            <Copy className="h-4 w-4 mr-2" />
                          )}
                          Copy
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteInviteLink(link.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>People with Access</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading members...</p>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              <div className="border rounded-md divide-y">
                {members.map((member) => (
                  <div key={member.id} className="p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">
                        {member.profile?.username || 'No username'}
                        {member.user_id === user?.id && (
                          <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(role) => updateMemberRole(member.id, role as 'view' | 'edit' | 'admin')}
                        disabled={member.user_id === user?.id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="view">View</SelectItem>
                          <SelectItem value="edit">Edit</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {member.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMember(member.id)}
                          aria-label="Remove member"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-muted p-4 rounded-md space-y-2">
            <h4 className="font-medium text-sm">Role Permissions</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><strong>View:</strong> Can view the list and use voting, ratings, and comments</li>
              <li><strong>Edit:</strong> Can view and edit list items, but cannot access settings</li>
              <li><strong>Admin:</strong> Can view, edit, and manage list settings and members</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
