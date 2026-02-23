import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const { updatePassword, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (session) {
        setIsValidToken(true);
      } else {
        setIsValidToken(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setPasswordUpdated(true);
      toast.success('Password updated successfully!');
      setTimeout(() => {
        navigate('/signin');
      }, 2000);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <Loader2 className="h-12 w-12 text-slate-700 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifying reset link</CardTitle>
            <CardDescription>
              Please wait while we verify your password reset link...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <ListChecks className="h-12 w-12 text-slate-700" />
            </div>
            <CardTitle className="text-2xl font-bold">Invalid or expired link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/forgot-password')}
              className="w-full"
            >
              Request new reset link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (passwordUpdated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Password updated!</CardTitle>
            <CardDescription>
              Your password has been successfully reset. You can now sign in with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 text-center">
              Redirecting to sign in page...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-2">
            <ListChecks className="h-12 w-12 text-slate-700" />
          </div>
          <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-slate-500">Must be at least 8 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating password...' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
