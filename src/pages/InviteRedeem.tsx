import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, ListInviteLink } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function InviteRedeem() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [inviteLink, setInviteLink] = useState<ListInviteLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listName, setListName] = useState<string>('');

  useEffect(() => {
    if (token) {
      fetchInviteLink();
    }
  }, [token]);

  const fetchInviteLink = async () => {
    try {
      const { data: listInfo, error: listError } = await supabase
        .rpc('get_list_name_by_invite_token', { invite_token: token });

      if (listError) throw listError;

      if (!listInfo || listInfo.length === 0) {
        setError('This invite link is invalid or has expired.');
        setLoading(false);
        return;
      }

      const info = listInfo[0];

      const { data: linkData, error: linkDataError } = await supabase
        .from('list_invite_links')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (linkDataError) throw linkDataError;

      if (!linkData) {
        setError('This invite link is invalid or has expired.');
        setLoading(false);
        return;
      }

      setInviteLink(linkData);
      setListName(info.list_name);

      if (user) {
        await checkAndRedeemInvite(linkData);
      }
    } catch (error) {
      console.error('Error fetching invite link:', error);
      setError('Failed to load invite link.');
    } finally {
      setLoading(false);
    }
  };

  const checkAndRedeemInvite = async (link: ListInviteLink) => {
    try {
      const { data: existingMember, error: checkError } = await supabase
        .from('list_members')
        .select('id')
        .eq('list_id', link.list_id)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingMember) {
        toast.success('You already have access to this list');
        navigate(`/list/${link.list_id}`);
        return;
      }

      await redeemInvite();
    } catch (error) {
      console.error('Error checking membership:', error);
    }
  };

  const redeemInvite = async () => {
    if (!inviteLink || !user) return;

    setRedeeming(true);
    try {
      const { error: memberError } = await supabase
        .from('list_members')
        .insert([
          {
            list_id: inviteLink.list_id,
            user_id: user.id,
            role: inviteLink.role,
            invited_by: inviteLink.created_by,
          },
        ]);

      if (memberError) throw memberError;

      const { error: updateError } = await supabase
        .from('list_invite_links')
        .update({ used_count: inviteLink.used_count + 1 })
        .eq('id', inviteLink.id);

      if (updateError) throw updateError;

      toast.success('Successfully joined the list!');
      navigate(`/list/${inviteLink.list_id}`);
    } catch (error) {
      console.error('Error redeeming invite:', error);
      toast.error('Failed to join the list. Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-6 w-6 text-primary" />
              <CardTitle>You're Invited!</CardTitle>
            </div>
            <CardDescription>
              You've been invited to join "{listName}" with {inviteLink?.role} access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => navigate('/signin', { state: { returnTo: `/invite/${token}` } })} className="w-full">
              Sign In to Accept
            </Button>
            <Button onClick={() => navigate('/signup', { state: { returnTo: `/invite/${token}` } })} variant="outline" className="w-full">
              Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-6 w-6 text-primary" />
            <CardTitle>Join List</CardTitle>
          </div>
          <CardDescription>
            Accept the invitation to join "{listName}" with {inviteLink?.role} access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={redeemInvite} disabled={redeeming} className="w-full">
            {redeeming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              'Accept Invitation'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
