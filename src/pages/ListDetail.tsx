import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, List, ListItem, ListSettings, ListStatus, ListRating, ListVote, ListComment } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { ArrowLeft, Plus, Shuffle, GripVertical, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { QuickAddItem } from '@/components/QuickAddItem';
import { ListItemCard } from '@/components/ListItemCard';
import { SortableListItem } from '@/components/SortableListItem';
import { getAnonymousUserId } from '@/lib/anonymousUser';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [settings, setSettings] = useState<ListSettings | null>(null);
  const [statuses, setStatuses] = useState<ListStatus[]>([]);
  const [ratings, setRatings] = useState<Record<string, ListRating[]>>({});
  const [votes, setVotes] = useState<Record<string, ListVote[]>>({});
  const [comments, setComments] = useState<Record<string, ListComment[]>>({});
  const [userProfiles, setUserProfiles] = useState<Record<string, { username: string | null; email: string }>>({});
  const [loading, setLoading] = useState(true);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const effectiveUserId = user?.id || getAnonymousUserId();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [user, id]);

  const applySortOrder = (
    items: ListItem[],
    sortBy: string,
    ratingsMap: Record<string, ListRating[]>
  ): ListItem[] => {
    const itemsCopy = [...items];

    switch (sortBy) {
      case 'votes':
        return itemsCopy.sort((a, b) => b.upvotes - a.upvotes);

      case 'ratings':
        return itemsCopy.sort((a, b) => {
          const aRatings = ratingsMap[a.id] || [];
          const bRatings = ratingsMap[b.id] || [];
          const aAvg = aRatings.length > 0
            ? aRatings.reduce((sum, r) => sum + r.rating, 0) / aRatings.length
            : 0;
          const bAvg = bRatings.length > 0
            ? bRatings.reduce((sum, r) => sum + r.rating, 0) / bRatings.length
            : 0;
          return bAvg - aAvg;
        });

      case 'shuffle':
        return itemsCopy.sort(() => Math.random() - 0.5);

      case 'manual':
      default:
        return itemsCopy.sort((a, b) => a.position - b.position);
    }
  };

  const fetchData = async () => {
    try {
      const [listRes, itemsRes, settingsRes, statusesRes] = await Promise.all([
        supabase.from('lists').select('*').eq('id', id).maybeSingle(),
        supabase.from('list_items').select('*').eq('list_id', id).order('position'),
        supabase.from('list_settings').select('*').eq('list_id', id).maybeSingle(),
        supabase.from('list_statuses').select('*').eq('list_id', id).order('position'),
      ]);

      if (listRes.error) throw listRes.error;
      if (!listRes.data) {
        if (!user) {
          navigate('/signin', { state: { returnTo: `/list/${id}` } });
          return;
        } else {
          toast.error('This list is private or doesn\'t exist. Please ask the owner to invite you.');
          navigate('/dashboard');
          return;
        }
      }

      if (!user && listRes.data.public_access_mode !== 'anyone') {
        navigate('/signin', { state: { returnTo: `/list/${id}` } });
        return;
      }

      const memberRole = user ? (await supabase
        .from('list_members')
        .select('role')
        .eq('list_id', listRes.data.id)
        .eq('user_id', user.id)
        .maybeSingle()
      ).data?.role : null;

      const userIsOwner = user && listRes.data.user_id === user.id;
      const userCanEdit = user && (
        userIsOwner ||
        memberRole === 'admin' ||
        memberRole === 'edit'
      );
      const userIsAdmin = user && (userIsOwner || memberRole === 'admin');

      setCanEdit(!!userCanEdit);
      setIsAdmin(!!userIsAdmin);

      setList(listRes.data);
      setSettings(settingsRes.data);
      setStatuses(statusesRes.data || []);

      const itemIds = (itemsRes.data || []).map((item) => item.id);

      const [ratingsRes, votesRes, commentsRes] = await Promise.all([
        itemIds.length > 0
          ? supabase.from('list_ratings').select('*').in('list_item_id', itemIds)
          : Promise.resolve({ data: [], error: null }),
        itemIds.length > 0
          ? supabase.from('list_votes').select('*').in('list_item_id', itemIds)
          : Promise.resolve({ data: [], error: null }),
        itemIds.length > 0
          ? supabase.from('list_item_comments').select('*').in('list_item_id', itemIds).order('created_at', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
      ]);

      const ratingsMap: Record<string, ListRating[]> = {};
      (ratingsRes.data || []).forEach((rating) => {
        if (!ratingsMap[rating.list_item_id]) {
          ratingsMap[rating.list_item_id] = [];
        }
        ratingsMap[rating.list_item_id].push(rating);
      });
      setRatings(ratingsMap);

      const votesMap: Record<string, ListVote[]> = {};
      (votesRes.data || []).forEach((vote) => {
        if (!votesMap[vote.list_item_id]) {
          votesMap[vote.list_item_id] = [];
        }
        votesMap[vote.list_item_id].push(vote);
      });
      setVotes(votesMap);

      const sortedItems = applySortOrder(itemsRes.data || [], settingsRes.data?.sort_by || 'manual', ratingsMap);
      setItems(sortedItems);

      const commentsMap: Record<string, ListComment[]> = {};
      (commentsRes.data || []).forEach((comment) => {
        if (!commentsMap[comment.list_item_id]) {
          commentsMap[comment.list_item_id] = [];
        }
        commentsMap[comment.list_item_id].push(comment);
      });
      setComments(commentsMap);

      const uniqueUserIds = Array.from(
        new Set([
          ...(commentsRes.data || []).map(c => c.user_id),
        ])
      );

      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, username, email')
          .in('id', uniqueUserIds);

        const profilesMap: Record<string, { username: string | null; email: string }> = {};
        (profiles || []).forEach((profile) => {
          profilesMap[profile.id] = {
            username: profile.username,
            email: profile.email,
          };
        });
        setUserProfiles(profilesMap);
      }
    } catch (error) {
      toast.error('Failed to load list');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (data: { title: string; description: string; url: string; status: string }) => {
    if (!user) {
      toast.error('Please sign in to add items');
      return;
    }

    try {
      const maxPosition = items.length > 0 ? Math.max(...items.map((i) => i.position)) : -1;

      const { data: newItem, error } = await supabase
        .from('list_items')
        .insert([
          {
            list_id: id!,
            user_id: user.id,
            title: data.title,
            description: data.description,
            url: data.url,
            status: data.status,
            position: maxPosition + 1,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setItems([...items, newItem]);
      setShowQuickAdd(false);
      toast.success('Item added!');
    } catch (error) {
      toast.error('Failed to add item');
      console.error(error);
    }
  };

  const handleStatusChange = async (item: ListItem, status: string) => {
    try {
      const { error } = await supabase.from('list_items').update({ status }).eq('id', item.id);

      if (error) throw error;
      setItems(items.map((i) => (i.id === item.id ? { ...i, status } : i)));
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleTagsChange = async (item: ListItem, tags: string[]) => {
    try {
      const { error } = await supabase.from('list_items').update({ tags }).eq('id', item.id);

      if (error) throw error;
      setItems(items.map((i) => (i.id === item.id ? { ...i, tags } : i)));
    } catch (error) {
      toast.error('Failed to update tags');
    }
  };

  const handleVote = async (item: ListItem) => {
    try {
      const userVote = (votes[item.id] || []).find((v) => v.user_id === effectiveUserId);

      if (userVote) {
        if (userVote.vote_type === 1) {
          const { error } = await supabase.from('list_votes').delete().eq('id', userVote.id);
          if (error) throw error;

          const { error: updateError } = await supabase
            .from('list_items')
            .update({ upvotes: item.upvotes - 1 })
            .eq('id', item.id);
          if (updateError) throw updateError;

          setVotes({
            ...votes,
            [item.id]: (votes[item.id] || []).filter((v) => v.id !== userVote.id),
          });
          const updatedItems = items.map((i) => (i.id === item.id ? { ...i, upvotes: i.upvotes - 1 } : i));
          setItems(settings?.sort_by === 'votes' ? applySortOrder(updatedItems, 'votes', ratings) : updatedItems);
        } else {
          const { error } = await supabase
            .from('list_votes')
            .update({ vote_type: 1 })
            .eq('id', userVote.id);
          if (error) throw error;

          const { error: updateError } = await supabase
            .from('list_items')
            .update({ upvotes: item.upvotes + 2 })
            .eq('id', item.id);
          if (updateError) throw updateError;

          setVotes({
            ...votes,
            [item.id]: (votes[item.id] || []).map((v) =>
              v.id === userVote.id ? { ...v, vote_type: 1 } : v
            ),
          });
          const updatedItems = items.map((i) => (i.id === item.id ? { ...i, upvotes: i.upvotes + 2 } : i));
          setItems(settings?.sort_by === 'votes' ? applySortOrder(updatedItems, 'votes', ratings) : updatedItems);
        }
      } else {
        const { data, error } = await supabase
          .from('list_votes')
          .insert([{ list_item_id: item.id, user_id: effectiveUserId, vote_type: 1 }])
          .select()
          .single();
        if (error) throw error;

        const { error: updateError } = await supabase
          .from('list_items')
          .update({ upvotes: item.upvotes + 1 })
          .eq('id', item.id);
        if (updateError) throw updateError;

        setVotes({
          ...votes,
          [item.id]: [...(votes[item.id] || []), data],
        });
        const updatedItems = items.map((i) => (i.id === item.id ? { ...i, upvotes: i.upvotes + 1 } : i));
        setItems(settings?.sort_by === 'votes' ? applySortOrder(updatedItems, 'votes', ratings) : updatedItems);
      }
    } catch (error) {
      toast.error('Failed to vote');
    }
  };

  const handleDownvote = async (item: ListItem) => {
    try {
      const userVote = (votes[item.id] || []).find((v) => v.user_id === effectiveUserId);

      if (userVote) {
        if (userVote.vote_type === -1) {
          const { error } = await supabase.from('list_votes').delete().eq('id', userVote.id);
          if (error) throw error;

          const { error: updateError } = await supabase
            .from('list_items')
            .update({ upvotes: item.upvotes + 1 })
            .eq('id', item.id);
          if (updateError) throw updateError;

          setVotes({
            ...votes,
            [item.id]: (votes[item.id] || []).filter((v) => v.id !== userVote.id),
          });
          const updatedItems = items.map((i) => (i.id === item.id ? { ...i, upvotes: i.upvotes + 1 } : i));
          setItems(settings?.sort_by === 'votes' ? applySortOrder(updatedItems, 'votes', ratings) : updatedItems);
        } else {
          const { error } = await supabase
            .from('list_votes')
            .update({ vote_type: -1 })
            .eq('id', userVote.id);
          if (error) throw error;

          const { error: updateError } = await supabase
            .from('list_items')
            .update({ upvotes: item.upvotes - 2 })
            .eq('id', item.id);
          if (updateError) throw updateError;

          setVotes({
            ...votes,
            [item.id]: (votes[item.id] || []).map((v) =>
              v.id === userVote.id ? { ...v, vote_type: -1 } : v
            ),
          });
          const updatedItems = items.map((i) => (i.id === item.id ? { ...i, upvotes: i.upvotes - 2 } : i));
          setItems(settings?.sort_by === 'votes' ? applySortOrder(updatedItems, 'votes', ratings) : updatedItems);
        }
      } else {
        const { data, error } = await supabase
          .from('list_votes')
          .insert([{ list_item_id: item.id, user_id: effectiveUserId, vote_type: -1 }])
          .select()
          .single();
        if (error) throw error;

        const { error: updateError } = await supabase
          .from('list_items')
          .update({ upvotes: item.upvotes - 1 })
          .eq('id', item.id);
        if (updateError) throw updateError;

        setVotes({
          ...votes,
          [item.id]: [...(votes[item.id] || []), data],
        });
        const updatedItems = items.map((i) => (i.id === item.id ? { ...i, upvotes: i.upvotes - 1 } : i));
        setItems(settings?.sort_by === 'votes' ? applySortOrder(updatedItems, 'votes', ratings) : updatedItems);
      }
    } catch (error) {
      toast.error('Failed to downvote');
    }
  };

  const handleAddComment = async (itemId: string, comment: string) => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('list_item_comments')
        .insert([{ list_item_id: itemId, user_id: user.id, comment }])
        .select()
        .single();

      if (error) throw error;

      setComments({
        ...comments,
        [itemId]: [...(comments[itemId] || []), data],
      });

      if (!userProfiles[user.id]) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, username, email')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setUserProfiles({
            ...userProfiles,
            [user.id]: { username: profile.username, email: profile.email },
          });
        }
      }

      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
      console.error(error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('list_item_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      const updatedComments: Record<string, ListComment[]> = {};
      Object.keys(comments).forEach((itemId) => {
        updatedComments[itemId] = comments[itemId].filter((c) => c.id !== commentId);
      });
      setComments(updatedComments);

      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
      console.error(error);
    }
  };

  const handleRate = async (item: ListItem, rating: number) => {
    try {
      const userRating = (ratings[item.id] || []).find((r) => r.user_id === effectiveUserId);
      let updatedRatings: Record<string, ListRating[]>;

      if (userRating) {
        const { error } = await supabase
          .from('list_ratings')
          .update({ rating })
          .eq('id', userRating.id);
        if (error) throw error;

        updatedRatings = {
          ...ratings,
          [item.id]: (ratings[item.id] || []).map((r) =>
            r.id === userRating.id ? { ...r, rating } : r
          ),
        };
      } else {
        const { data, error } = await supabase
          .from('list_ratings')
          .insert([{ list_item_id: item.id, user_id: effectiveUserId, rating }])
          .select()
          .single();
        if (error) throw error;

        updatedRatings = {
          ...ratings,
          [item.id]: [...(ratings[item.id] || []), data],
        };
      }

      setRatings(updatedRatings);

      if (settings?.sort_by === 'ratings') {
        setItems(applySortOrder(items, 'ratings', updatedRatings));
      }

      toast.success('Rating saved');
    } catch (error) {
      toast.error('Failed to rate');
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      const { error } = await supabase.from('list_items').delete().eq('id', itemId);
      if (error) throw error;

      setItems(items.filter((i) => i.id !== itemId));
      toast.success('Item deleted');
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleEditItem = async (itemId: string, data: { title: string; description: string; url: string }) => {
    const { error } = await supabase
      .from('list_items')
      .update({ title: data.title, description: data.description, url: data.url })
      .eq('id', itemId);

    if (error) {
      toast.error('Failed to update item');
      throw error;
    }

    setItems(items.map((i) => i.id === itemId ? { ...i, ...data } : i));
    toast.success('Item updated');
  };

  const handleShuffle = async () => {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setItems(shuffled);

    try {
      const updates = shuffled.map((item, index) => ({
        id: item.id,
        position: index,
      }));

      for (const update of updates) {
        await supabase
          .from('list_items')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      toast.success('Items shuffled!');
    } catch (error) {
      toast.error('Failed to save shuffle order');
      console.error(error);
      fetchData();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedItems = arrayMove(items, oldIndex, newIndex);
    setItems(reorderedItems);

    try {
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        position: index,
      }));

      await Promise.all(
        updates.map((update) =>
          supabase
            .from('list_items')
            .update({ position: update.position })
            .eq('id', update.id)
        )
      );

      toast.success('Order updated');
    } catch (error) {
      toast.error('Failed to update order');
      console.error(error);
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!list || !settings) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-1 sm:px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            {user ? (
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              {!user && (
                <>
                  <Button variant="outline" asChild>
                    <Link to="/signin">Sign In</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/signup">Sign Up</Link>
                  </Button>
                </>
              )}
              {isAdmin && (
                <Button variant="outline" asChild>
                  <Link to={`/list/${id}/settings`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{list.name}</h1>
              {list.description && <p className="text-slate-600 mt-1">{list.description}</p>}
            </div>
            <div className="flex gap-2">
              {settings.enable_ordering && canEdit && (
                <Toggle
                  pressed={reorderMode}
                  onPressedChange={setReorderMode}
                  variant="outline"
                  className="data-[state=on]:bg-slate-900 data-[state=on]:text-white"
                >
                  <GripVertical className="h-4 w-4 mr-2" />
                  Reorder
                </Toggle>
              )}
              {settings.enable_shuffle && (
                <Button variant="outline" onClick={handleShuffle}>
                  <Shuffle className="h-4 w-4 mr-2" />
                  Shuffle
                </Button>
              )}
              {canEdit && (
                <Button onClick={() => setShowQuickAdd(!showQuickAdd)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-1 sm:px-4 py-8">
        {showQuickAdd && (
          <div className="mb-6">
            <QuickAddItem
              statuses={statuses}
              onAdd={handleAddItem}
              onCancel={() => setShowQuickAdd(false)}
              enableStatus={settings.enable_status}
            />
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No items yet</h3>
            <p className="text-slate-600 mb-4">
              {canEdit ? 'Add your first item to this list' : 'This list is empty'}
            </p>
            {canEdit && (
              <Button onClick={() => setShowQuickAdd(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )}
          </div>
        ) : reorderMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {items.map((item, index) => {
                  const itemRatings = ratings[item.id] || [];
                  const userRating = itemRatings.find((r) => r.user_id === effectiveUserId);
                  const avgRating =
                    itemRatings.length > 0
                      ? itemRatings.reduce((sum, r) => sum + r.rating, 0) / itemRatings.length
                      : null;
                  const userVote = (votes[item.id] || []).find((v) => v.user_id === effectiveUserId);
                  const userVoted = userVote?.vote_type === 1;
                  const userDownvoted = userVote?.vote_type === -1;

                  return (
                    <SortableListItem
                      key={item.id}
                      item={item}
                      settings={settings}
                      statuses={statuses}
                      userVoted={userVoted}
                      userDownvoted={userDownvoted}
                      userRating={userRating?.rating || null}
                      averageRating={avgRating}
                      comments={comments[item.id] || []}
                      userProfiles={userProfiles}
                      onStatusChange={(status) => handleStatusChange(item, status)}
                      onTagsChange={(tags) => handleTagsChange(item, tags)}
                      onVote={() => handleVote(item)}
                      onDownvote={() => handleDownvote(item)}
                      onRate={(rating) => handleRate(item, rating)}
                      onDelete={() => handleDelete(item.id)}
                      onEdit={canEdit ? (data) => handleEditItem(item.id, data) : undefined}
                      onAddComment={(comment) => handleAddComment(item.id, comment)}
                      onDeleteComment={handleDeleteComment}
                      orderNumber={settings.enable_ordering ? index + 1 : undefined}
                      canEdit={canEdit}
                      currentUserId={user?.id}
                      canReorder={canEdit}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const itemRatings = ratings[item.id] || [];
              const userRating = itemRatings.find((r) => r.user_id === effectiveUserId);
              const avgRating =
                itemRatings.length > 0
                  ? itemRatings.reduce((sum, r) => sum + r.rating, 0) / itemRatings.length
                  : null;
              const userVote = (votes[item.id] || []).find((v) => v.user_id === effectiveUserId);
              const userVoted = userVote?.vote_type === 1;
              const userDownvoted = userVote?.vote_type === -1;

              return (
                <ListItemCard
                  key={item.id}
                  item={item}
                  settings={settings}
                  statuses={statuses}
                  userVoted={userVoted}
                  userDownvoted={userDownvoted}
                  userRating={userRating?.rating || null}
                  averageRating={avgRating}
                  comments={comments[item.id] || []}
                  userProfiles={userProfiles}
                  onStatusChange={(status) => handleStatusChange(item, status)}
                  onTagsChange={(tags) => handleTagsChange(item, tags)}
                  onVote={() => handleVote(item)}
                  onDownvote={() => handleDownvote(item)}
                  onRate={(rating) => handleRate(item, rating)}
                  onDelete={() => handleDelete(item.id)}
                  onEdit={canEdit ? (data) => handleEditItem(item.id, data) : undefined}
                  onAddComment={(comment) => handleAddComment(item.id, comment)}
                  onDeleteComment={handleDeleteComment}
                  orderNumber={settings.enable_ordering ? index + 1 : undefined}
                  canEdit={canEdit}
                  currentUserId={user?.id}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
