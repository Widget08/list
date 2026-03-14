import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ListItem, ListSettings, ListStatus, ListComment } from '@/lib/supabase';
import { ArrowUp, ArrowDown, Trash2, ExternalLink, Star, MessageSquare, Check, X, Send, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

type ListItemCardProps = {
  item: ListItem;
  settings: ListSettings;
  statuses: ListStatus[];
  userVoted: boolean;
  userDownvoted?: boolean;
  userRating: number | null;
  averageRating: number | null;
  comments: ListComment[];
  userProfiles: Record<string, { username: string | null; email: string }>;
  onStatusChange: (status: string) => void;
  onTagsChange: (tags: string[]) => void;
  onVote: () => void;
  onDownvote?: () => void;
  onRate: (rating: number) => void;
  onDelete: () => void;
  onEdit?: (data: { title: string; description: string; url: string }) => Promise<void>;
  onAddComment: (comment: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  orderNumber?: number;
  canEdit?: boolean;
  currentUserId?: string;
};

export function ListItemCard({
  item,
  settings,
  statuses,
  userVoted,
  userDownvoted = false,
  userRating,
  averageRating,
  comments,
  userProfiles,
  onStatusChange,
  onTagsChange,
  onVote,
  onDownvote,
  onRate,
  onDelete,
  onEdit,
  onAddComment,
  onDeleteComment,
  orderNumber,
  canEdit = true,
  currentUserId,
}: ListItemCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description || '');
  const [editUrl, setEditUrl] = useState(item.url || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEdit = () => {
    setEditTitle(item.title);
    setEditDescription(item.description || '');
    setEditUrl(item.url || '');
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !onEdit) return;
    setIsSavingEdit(true);
    try {
      await onEdit({ title: editTitle.trim(), description: editDescription.trim(), url: editUrl.trim() });
      setShowEditDialog(false);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment);
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <>
    <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Item title"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Optional description"
              className="min-h-[80px] resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-url">URL</Label>
            <Input
              id="edit-url"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isSavingEdit}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} disabled={!editTitle.trim() || isSavingEdit}>
            {isSavingEdit ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="py-3 sm:py-4 px-2 sm:px-6">
        <div className="flex items-start gap-2 sm:gap-3">
          {settings.enable_ordering && orderNumber !== undefined && (
            <div className="w-8 shrink-0 text-sm font-medium text-slate-500 mt-1">
              #{orderNumber}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3
                  className={cn(
                    'font-medium break-words',
                    item.completed ? 'line-through text-slate-500' : 'text-slate-900'
                  )}
                >
                  {item.title}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center ml-2 text-blue-600 hover:text-blue-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </h3>
              </div>

              {canEdit && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-black hover:bg-slate-100"
                    >
                      ...
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-40 p-1">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleOpenEdit}
                        className="w-full justify-start text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onDelete}
                      className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {item.description && (
              <p
                className={cn(
                  'text-sm mt-2 break-words',
                  item.completed ? 'line-through text-slate-400' : 'text-slate-600'
                )}
              >
                {item.description}
              </p>
            )}

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                  {settings.enable_status && !settings.allow_multiple_tags && canEdit && (
                    <Select value={item.status} onValueChange={onStatusChange}>
                      <SelectTrigger className="w-32 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {settings.enable_status && !settings.allow_multiple_tags && !canEdit && item.status && (
                    <Badge variant="secondary" className="text-xs">
                      {item.status}
                    </Badge>
                  )}

                  {settings.enable_status && settings.allow_multiple_tags && canEdit && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-dashed"
                        >
                          Tags
                          {item.tags?.length > 0 && (
                            <span className="ml-1 rounded-full bg-slate-200 px-1.5 text-xs">
                              {item.tags.length}
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-52 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search tags..." />
                          <CommandList>
                            <CommandEmpty>No tags found.</CommandEmpty>
                            <CommandGroup>
                              {statuses.map((status) => {
                                const isSelected = item.tags?.includes(status.name);
                                return (
                                  <CommandItem
                                    key={status.id}
                                    onSelect={() => {
                                      const currentTags = item.tags || [];
                                      if (isSelected) {
                                        onTagsChange(currentTags.filter((t) => t !== status.name));
                                      } else {
                                        onTagsChange([...currentTags, status.name]);
                                      }
                                    }}
                                  >
                                    <div className="flex items-center gap-2 flex-1">
                                      <div
                                        className={cn(
                                          'h-4 w-4 border rounded-sm flex items-center justify-center',
                                          isSelected ? 'bg-primary border-primary' : 'border-input'
                                        )}
                                      >
                                        {isSelected && <Check className="h-3 w-3 text-white" />}
                                      </div>
                                      <span>{status.name}</span>
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}

                  {settings.enable_status && settings.allow_multiple_tags && !canEdit && item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {settings.enable_status && settings.allow_multiple_tags && item.tags?.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs h-6 gap-1"
                    >
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTagsChange(item.tags.filter((t) => t !== tag));
                        }}
                      />
                    </Badge>
                  ))}

                  {settings.enable_voting && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant={userVoted ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 px-1.5 sm:px-2"
                        onClick={onVote}
                      >
                        <ArrowUp className="h-3 w-3 mr-0.5 sm:mr-1" />
                        {item.upvotes}
                      </Button>
                      {settings.enable_downvote && onDownvote && (
                        <Button
                          variant={userDownvoted ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 px-1.5 sm:px-2"
                          onClick={onDownvote}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}

                  {settings.enable_rating && (
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => onRate(rating)}
                          className="focus:outline-none p-0.5 sm:p-1"
                        >
                          <Star
                            className={cn(
                              'h-3.5 w-3.5 sm:h-4 sm:w-4',
                              userRating && rating <= userRating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-slate-300'
                            )}
                          />
                        </button>
                      ))}
                      {averageRating !== null && (
                        <span className="text-xs text-slate-600 ml-0.5 sm:ml-1 whitespace-nowrap">
                          {averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  )}

                  {settings.enable_comments && (
                    <Button
                      variant={showComments ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-1.5 sm:px-2 shrink-0"
                      onClick={() => setShowComments(!showComments)}
                    >
                      <MessageSquare className="h-3 w-3 mr-0.5 sm:mr-1" />
                      {comments.length}
                    </Button>
                  )}
                </div>
          </div>
        </div>

        {settings.enable_comments && showComments && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Comments ({comments.length})</h4>

            <div className="space-y-3 mb-4">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No comments yet. Be the first to comment!</p>
              ) : (
                comments.map((comment) => {
                  const profile = userProfiles[comment.user_id];
                  const displayName = profile?.username || profile?.email || 'Unknown User';
                  const isOwner = currentUserId === comment.user_id;

                  return (
                    <div key={comment.id} className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">{displayName}</span>
                          <span className="text-xs text-slate-500">
                            {new Date(comment.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{comment.comment}</p>
                    </div>
                  );
                })
              )}
            </div>

            {currentUserId && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px] resize-none"
                  disabled={isSubmitting}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleAddComment();
                    }
                  }}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}
