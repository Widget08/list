import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, List } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ListChecks, Plus, Trash2, User, Settings, Search } from 'lucide-react';
import { toast } from 'sonner';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [listPermissions, setListPermissions] = useState<Record<string, { isAdmin: boolean }>>({});

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    fetchLists();
  }, [user, navigate, filterType]);

  const fetchLists = async () => {
    try {
      let data: List[] = [];

      if (filterType === 'all') {
        const [createdRes, sharedRes, publicRes] = await Promise.all([
          supabase
            .from('lists')
            .select('*')
            .eq('user_id', user!.id),
          supabase
            .from('lists')
            .select('*, list_members!inner(*)')
            .neq('user_id', user!.id)
            .eq('list_members.user_id', user!.id),
          supabase
            .from('lists')
            .select('*')
            .in('public_access_mode', ['members', 'anyone'])
        ]);

        if (createdRes.error) throw createdRes.error;
        if (sharedRes.error) throw sharedRes.error;
        if (publicRes.error) throw publicRes.error;

        const allLists = [
          ...(createdRes.data || []),
          ...(sharedRes.data || []),
          ...(publicRes.data || [])
        ];

        const uniqueLists = Array.from(
          new Map(allLists.map(list => [list.id, list])).values()
        );

        uniqueLists.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        data = uniqueLists;
      } else if (filterType === 'created') {
        const { data: createdLists, error } = await supabase
          .from('lists')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        data = createdLists || [];
      } else if (filterType === 'shared') {
        const { data: sharedLists, error } = await supabase
          .from('lists')
          .select('*, list_members!inner(*)')
          .neq('user_id', user!.id)
          .eq('list_members.user_id', user!.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        data = sharedLists || [];
      } else if (filterType === 'public') {
        const { data: publicLists, error } = await supabase
          .from('lists')
          .select('*')
          .in('public_access_mode', ['members', 'anyone'])
          .order('created_at', { ascending: false });

        if (error) throw error;
        data = publicLists || [];
      }

      setLists(data);

      await fetchListPermissions(data);
    } catch (error) {
      toast.error('Failed to load lists');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchListPermissions = async (lists: List[]) => {
    if (!user) return;

    const permissions: Record<string, { isAdmin: boolean }> = {};

    await Promise.all(
      lists.map(async (list) => {
        const isOwner = list.user_id === user.id;

        if (isOwner) {
          permissions[list.id] = { isAdmin: true };
          return;
        }

        const { data: member } = await supabase
          .from('list_members')
          .select('role')
          .eq('list_id', list.id)
          .eq('user_id', user.id)
          .maybeSingle();

        permissions[list.id] = {
          isAdmin: member?.role === 'admin'
        };
      })
    );

    setListPermissions(permissions);
  };

  const createList = async () => {
    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('lists')
        .insert([
          {
            user_id: user!.id,
            name: newListName,
            description: newListDescription,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setLists([data, ...lists]);
      setNewListName('');
      setNewListDescription('');
      setIsCreateDialogOpen(false);
      toast.success('List created successfully!');
    } catch (error) {
      toast.error('Failed to create list');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const deleteList = async (id: string) => {
    try {
      const { error } = await supabase.from('lists').delete().eq('id', id);

      if (error) throw error;

      setLists(lists.filter((list) => list.id !== id));
      toast.success('List deleted successfully');
    } catch (error) {
      toast.error('Failed to delete list');
      console.error(error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="w-full bg-white border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-6 w-6 sm:h-8 sm:w-8 text-slate-700" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Lists</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/profile')} className="hidden sm:flex">
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/profile')} className="sm:hidden">
              <User className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="hidden sm:inline-flex">
              Sign Out
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="sm:hidden px-2">
              Out
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">My Lists</h2>
            <p className="text-sm sm:text-base text-slate-600 mt-1">Organize your tasks and track items</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                New List
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new list</DialogTitle>
                <DialogDescription>Add a name and optional description for your list</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="My List"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What's this list for?"
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    disabled={creating}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button onClick={createList} disabled={creating}>
                  {creating ? 'Creating...' : 'Create List'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search lists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ToggleGroup type="single" value={filterType} onValueChange={(value) => value && setFilterType(value)} className="justify-start sm:justify-center">
              <ToggleGroupItem value="all" aria-label="All lists" className="text-xs sm:text-sm">
                All
              </ToggleGroupItem>
              <ToggleGroupItem value="created" aria-label="Lists I created" className="text-xs sm:text-sm">
                Created
              </ToggleGroupItem>
              <ToggleGroupItem value="shared" aria-label="Shared with me" className="text-xs sm:text-sm">
                Shared with me
              </ToggleGroupItem>
              <ToggleGroupItem value="public" aria-label="Public lists" className="text-xs sm:text-sm">
                Public
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {lists.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center">
              <ListChecks className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">No lists yet</h3>
              <p className="text-sm sm:text-base text-slate-600 mb-4">Create your first list to get started</p>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create List
              </Button>
            </CardContent>
          </Card>
        ) : (() => {
          const filteredLists = lists.filter((list) => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
              list.name.toLowerCase().includes(query) ||
              (list.description && list.description.toLowerCase().includes(query))
            );
          });

          if (filteredLists.length === 0) {
            return (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Search className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">No lists found</h3>
                  <p className="text-sm sm:text-base text-slate-600 mb-4">Try adjusting your search or filter</p>
                </CardContent>
              </Card>
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredLists.map((list) => (
              <Card
                key={list.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/list/${list.id}`)}
              >
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl break-words">{list.name}</CardTitle>
                      {list.description && (
                        <CardDescription className="mt-2 text-sm break-words">{list.description}</CardDescription>
                      )}
                    </div>
                    {listPermissions[list.id]?.isAdmin && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-black hover:bg-slate-100 shrink-0 ml-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            ...
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-48 p-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/list/${list.id}/settings`);
                            }}
                            className="w-full justify-start text-black hover:bg-slate-100"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteList(list.id);
                            }}
                            className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
          );
        })()}
      </main>
    </div>
  );
}
