import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, List, ListSettings as ListSettingsType, ListStatus } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, Copy, Check, GripVertical, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ShareListDialog } from '@/components/ShareListDialog';

export function ListSettings() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<List | null>(null);
  const [settings, setSettings] = useState<ListSettingsType | null>(null);
  const [statuses, setStatuses] = useState<ListStatus[]>([]);
  const [newStatusName, setNewStatusName] = useState('');
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editingStatusName, setEditingStatusName] = useState('');
  const [draggedStatus, setDraggedStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    if (id) {
      fetchData();
    }
  }, [user, id, navigate]);

  const fetchData = async () => {
    try {
      const [listResponse, settingsResponse, statusesResponse] = await Promise.all([
        supabase.from('lists').select('*').eq('id', id).maybeSingle(),
        supabase.from('list_settings').select('*').eq('list_id', id).maybeSingle(),
        supabase.from('list_statuses').select('*').eq('list_id', id).order('position'),
      ]);

      if (listResponse.error) throw listResponse.error;
      if (settingsResponse.error) throw settingsResponse.error;
      if (statusesResponse.error) throw statusesResponse.error;

      if (!listResponse.data) {
        toast.error('List not found');
        navigate('/dashboard');
        return;
      }

      setList(listResponse.data);
      setSettings(settingsResponse.data);
      setStatuses(statusesResponse.data || []);
    } catch (error) {
      toast.error('Failed to load settings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof ListSettingsType, value: boolean) => {
    if (!settings) return;

    try {
      const updates: Partial<ListSettingsType> = { [key]: value };

      if (key === 'enable_voting' && !value) {
        updates.enable_downvote = false;
      }

      const { error } = await supabase
        .from('list_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings({ ...settings, ...updates });
      toast.success('Setting updated');
    } catch (error) {
      toast.error('Failed to update setting');
      console.error(error);
    }
  };

  const updateSortBy = async (sortBy: 'manual' | 'votes' | 'ratings' | 'shuffle') => {
    if (!settings) return;

    try {
      const { error } = await supabase
        .from('list_settings')
        .update({ sort_by: sortBy })
        .eq('id', settings.id);

      if (error) throw error;

      setSettings({ ...settings, sort_by: sortBy });
      toast.success('Sort order updated');
    } catch (error) {
      toast.error('Failed to update sort order');
      console.error(error);
    }
  };

  const addStatus = async () => {
    if (!newStatusName.trim()) {
      toast.error('Please enter a tag name');
      return;
    }

    try {
      const maxPosition = statuses.length > 0 ? Math.max(...statuses.map((s) => s.position)) : -1;

      const { data, error } = await supabase
        .from('list_statuses')
        .insert([
          {
            list_id: id!,
            name: newStatusName,
            position: maxPosition + 1,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setStatuses([...statuses, data]);
      setNewStatusName('');
      toast.success('Tag added');
    } catch (error) {
      toast.error('Failed to add status');
      console.error(error);
    }
  };

  const updateStatus = async (statusId: string, newName: string) => {
    if (!newName.trim()) {
      toast.error('Tag name cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('list_statuses')
        .update({ name: newName })
        .eq('id', statusId);

      if (error) throw error;

      setStatuses(statuses.map((s) => (s.id === statusId ? { ...s, name: newName } : s)));
      setEditingStatusId(null);
      setEditingStatusName('');
      toast.success('Tag updated');
    } catch (error) {
      toast.error('Failed to update tag');
      console.error(error);
    }
  };

  const deleteStatus = async (statusId: string) => {
    try {
      const { error } = await supabase.from('list_statuses').delete().eq('id', statusId);

      if (error) throw error;

      setStatuses(statuses.filter((s) => s.id !== statusId));
      toast.success('Tag deleted');
    } catch (error) {
      toast.error('Failed to delete tag');
      console.error(error);
    }
  };

  const startEditing = (status: ListStatus) => {
    setEditingStatusId(status.id);
    setEditingStatusName(status.name);
  };

  const cancelEditing = () => {
    setEditingStatusId(null);
    setEditingStatusName('');
  };

  const handleDragStart = (statusId: string) => {
    setDraggedStatus(statusId);
  };

  const handleDragOver = (e: React.DragEvent, targetStatusId: string) => {
    e.preventDefault();
    if (!draggedStatus || draggedStatus === targetStatusId) return;

    const draggedIndex = statuses.findIndex((s) => s.id === draggedStatus);
    const targetIndex = statuses.findIndex((s) => s.id === targetStatusId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newStatuses = [...statuses];
    const [removed] = newStatuses.splice(draggedIndex, 1);
    newStatuses.splice(targetIndex, 0, removed);

    setStatuses(newStatuses);
  };

  const handleDragEnd = async () => {
    if (!draggedStatus) return;

    try {
      const updates = statuses.map((status, index) => ({
        id: status.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('list_statuses')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      toast.success('Tag order updated');
    } catch (error) {
      toast.error('Failed to update tag order');
      console.error(error);
      fetchData();
    } finally {
      setDraggedStatus(null);
    }
  };

  const updateAccessMode = async (mode: 'none' | 'members' | 'anyone') => {
    if (!list) return;

    try {
      const { error } = await supabase
        .from('lists')
        .update({ public_access_mode: mode })
        .eq('id', list.id);

      if (error) throw error;

      setList({ ...list, public_access_mode: mode });
      toast.success('Access mode updated');
    } catch (error) {
      toast.error('Failed to update access mode');
      console.error(error);
    }
  };

  const copyShareLink = () => {
    if (!list) return;
    const shareUrl = `${window.location.origin}/list/${list.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!list || !settings) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(`/list/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 mt-4">{list.name} Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sharing</CardTitle>
                <CardDescription>Control who can access this list</CardDescription>
              </div>
              <ShareListDialog listId={id!} listName={list.name} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Public Access</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span>
                      {list.public_access_mode === 'none' && 'None'}
                      {list.public_access_mode === 'members' && 'Any Authenticated User'}
                      {list.public_access_mode === 'anyone' && 'Anyone with Link'}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[400px]">
                  <DropdownMenuItem onClick={() => updateAccessMode('none')} className="flex-col items-start py-3">
                    <div className="font-medium">None</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Only members with explicit access can view this list
                    </p>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAccessMode('members')} className="flex-col items-start py-3">
                    <div className="font-medium">Any Authenticated User</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Any authenticated user can view this list. Users have view rights unless given edit or admin role.
                    </p>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateAccessMode('anyone')} className="flex-col items-start py-3">
                    <div className="font-medium">Anyone with Link</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Anyone can view this list and interact with enabled features (voting, ratings, comments)
                    </p>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {(list.public_access_mode === 'members' || list.public_access_mode === 'anyone') && (
              <div className="flex gap-2">
                <Input
                  value={`${window.location.origin}/list/${list.id}`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyShareLink} variant="outline" size="icon">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>Enable or disable list features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tag Tracking</Label>
                <p className="text-sm text-slate-600">
                  Track items with custom tags
                </p>
              </div>
              <Toggle
                pressed={settings.enable_status}
                onPressedChange={(pressed) => updateSetting('enable_status', pressed)}
                variant="outline"
              >
                {settings.enable_status ? 'On' : 'Off'}
              </Toggle>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Voting</Label>
                <p className="text-sm text-slate-600">
                  Allow upvoting items
                </p>
              </div>
              <Toggle
                pressed={settings.enable_voting}
                onPressedChange={(pressed) => updateSetting('enable_voting', pressed)}
                variant="outline"
              >
                {settings.enable_voting ? 'On' : 'Off'}
              </Toggle>
            </div>

            {settings.enable_voting && (
              <div className="flex items-center justify-between pl-6">
                <div className="space-y-0.5">
                  <Label>Downvoting</Label>
                  <p className="text-sm text-slate-600">
                    Allow downvoting items
                  </p>
                </div>
                <Toggle
                  pressed={settings.enable_downvote}
                  onPressedChange={(pressed) => updateSetting('enable_downvote', pressed)}
                  variant="outline"
                >
                  {settings.enable_downvote ? 'On' : 'Off'}
                </Toggle>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Ratings</Label>
                <p className="text-sm text-slate-600">
                  Allow 1-5 star ratings
                </p>
              </div>
              <Toggle
                pressed={settings.enable_rating}
                onPressedChange={(pressed) => updateSetting('enable_rating', pressed)}
                variant="outline"
              >
                {settings.enable_rating ? 'On' : 'Off'}
              </Toggle>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Shuffle</Label>
                <p className="text-sm text-slate-600">
                  Enable shuffle button
                </p>
              </div>
              <Toggle
                pressed={settings.enable_shuffle}
                onPressedChange={(pressed) => updateSetting('enable_shuffle', pressed)}
                variant="outline"
              >
                {settings.enable_shuffle ? 'On' : 'Off'}
              </Toggle>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Manual Ordering</Label>
                <p className="text-sm text-slate-600">
                  Allow drag-and-drop reordering
                </p>
              </div>
              <Toggle
                pressed={settings.enable_ordering}
                onPressedChange={(pressed) => updateSetting('enable_ordering', pressed)}
                variant="outline"
              >
                {settings.enable_ordering ? 'On' : 'Off'}
              </Toggle>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Comments</Label>
                <p className="text-sm text-slate-600">
                  Allow commenting on items
                </p>
              </div>
              <Toggle
                pressed={settings.enable_comments}
                onPressedChange={(pressed) => updateSetting('enable_comments', pressed)}
                variant="outline"
              >
                {settings.enable_comments ? 'On' : 'Off'}
              </Toggle>
            </div>

            <div className="pt-4 border-t">
              <div className="space-y-3">
                <Label>Default Sort Order</Label>
                <p className="text-sm text-slate-600">
                  Choose how items are sorted by default
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span>
                        {settings.sort_by === 'manual' && 'Manual Order'}
                        {settings.sort_by === 'votes' && 'Sort by Votes'}
                        {settings.sort_by === 'ratings' && 'Sort by Ratings'}
                        {settings.sort_by === 'shuffle' && 'Shuffled'}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[400px]">
                    <DropdownMenuItem onClick={() => updateSortBy('manual')} className="flex-col items-start py-3">
                      <div className="font-medium">Manual Order</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Items appear in the order you arrange them
                      </p>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateSortBy('votes')} className="flex-col items-start py-3">
                      <div className="font-medium">Sort by Votes</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Items with the most votes appear first
                      </p>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateSortBy('ratings')} className="flex-col items-start py-3">
                      <div className="font-medium">Sort by Ratings</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Items with the highest average ratings appear first
                      </p>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateSortBy('shuffle')} className="flex-col items-start py-3">
                      <div className="font-medium">Shuffled</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Items appear in random order on each page load
                      </p>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {settings.enable_status && (
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <CardDescription>Manage tag options for this list</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                <div className="space-y-0.5">
                  <Label>Allow Multiple Tags</Label>
                  <p className="text-sm text-slate-600">
                    Let users select multiple tags per item
                  </p>
                </div>
                <Toggle
                  pressed={settings.allow_multiple_tags}
                  onPressedChange={(pressed) => updateSetting('allow_multiple_tags', pressed)}
                  variant="outline"
                >
                  {settings.allow_multiple_tags ? 'On' : 'Off'}
                </Toggle>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="New tag name"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addStatus()}
                />
                <Button onClick={addStatus}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {statuses.map((status) => (
                  <div
                    key={status.id}
                    draggable={editingStatusId !== status.id}
                    onDragStart={() => handleDragStart(status.id)}
                    onDragOver={(e) => handleDragOver(e, status.id)}
                    onDragEnd={handleDragEnd}
                    className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg cursor-move hover:bg-slate-100 transition-colors"
                  >
                    {editingStatusId !== status.id && (
                      <GripVertical className="h-5 w-5 text-slate-400 shrink-0" />
                    )}
                    {editingStatusId === status.id ? (
                      <>
                        <Input
                          value={editingStatusName}
                          onChange={(e) => setEditingStatusName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') updateStatus(status.id, editingStatusName);
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="flex-1"
                          autoFocus
                        />
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatus(status.id, editingStatusName)}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="font-medium flex-1">{status.name}</span>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(status)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteStatus(status.id)}
                            aria-label="Delete tag"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
