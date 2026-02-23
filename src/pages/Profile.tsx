import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, User, Edit, Check, X, Chrome, Link as LinkIcon, Unlink } from 'lucide-react';
import { toast } from 'sonner';

export function Profile() {
  const { user, signOut, linkGoogleAccount, unlinkGoogleAccount } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinkingGoogle, setUnlinkingGoogle] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;

      setUsername(data?.username || null);
      setNewUsername(data?.username || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const validateUsername = async (username: string): Promise<boolean> => {
    if (!username.trim()) {
      toast.error('Username cannot be empty');
      return false;
    }

    if (username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return false;
    }

    if (username.length > 30) {
      toast.error('Username must be less than 30 characters');
      return false;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      toast.error('Username can only contain letters, numbers, hyphens, and underscores');
      return false;
    }

    if (username.toLowerCase() === (username || '').toLowerCase()) {
      return true;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .ilike('username', username)
      .neq('id', user!.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      toast.error('Failed to validate username');
      return false;
    }

    if (data) {
      toast.error('Username is already taken');
      return false;
    }

    return true;
  };

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    if (newUsername === username) {
      setEditingUsername(false);
      return;
    }

    setSaving(true);
    try {
      const isValid = await validateUsername(newUsername);
      if (!isValid) {
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ username: newUsername.trim() })
        .eq('id', user!.id);

      if (error) throw error;

      setUsername(newUsername.trim());
      setEditingUsername(false);
      toast.success('Username updated successfully');
    } catch (error) {
      console.error('Error updating username:', error);
      toast.error('Failed to update username');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setNewUsername(username || '');
    setEditingUsername(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const isGoogleLinked = () => {
    return user?.identities?.some((identity) => identity.provider === 'google') || false;
  };

  const getGoogleEmail = () => {
    const googleIdentity = user?.identities?.find((identity) => identity.provider === 'google');
    return googleIdentity?.identity_data?.email || null;
  };

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    const { error } = await linkGoogleAccount();

    if (error) {
      setLinkingGoogle(false);
      toast.error(error.message || 'Failed to link Google account');
    }
  };

  const handleUnlinkGoogle = async () => {
    setUnlinkingGoogle(true);
    const { error } = await unlinkGoogleAccount();
    setUnlinkingGoogle(false);

    if (error) {
      toast.error(error.message || 'Failed to unlink Google account');
    } else {
      toast.success('Google account unlinked successfully');
    }
  };

  if (!user) {
    navigate('/signin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Profile Settings</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              {editingUsername ? (
                <div className="flex gap-2">
                  <Input
                    id="username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Enter username"
                    disabled={saving}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveUsername();
                      } else if (e.key === 'Escape') {
                        handleCancelEdit();
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveUsername}
                    disabled={saving}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <User className="h-5 w-5 text-slate-600" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-600">
                      {loading ? 'Loading...' : username || 'No username set'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingUsername(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-slate-500">
                Username must be 3-30 characters and can only contain letters, numbers, hyphens, and underscores
              </p>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Mail className="h-5 w-5 text-slate-600" />
              <div>
                <p className="text-sm font-medium text-slate-700">Email</p>
                <p className="text-sm text-slate-600">{user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>Link your Google account for easier sign-in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full border border-slate-200">
                  <Chrome className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Google</p>
                  {isGoogleLinked() ? (
                    <p className="text-xs text-slate-600">{getGoogleEmail()}</p>
                  ) : (
                    <p className="text-xs text-slate-500">Not connected</p>
                  )}
                </div>
              </div>
              {isGoogleLinked() ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUnlinkGoogle}
                  disabled={unlinkingGoogle}
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  {unlinkingGoogle ? 'Unlinking...' : 'Unlink'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleLinkGoogle}
                  disabled={linkingGoogle}
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  {linkingGoogle ? 'Linking...' : 'Link'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Manage your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleSignOut} className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
