import { ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ListItemCard } from './ListItemCard';
import { ListItem, ListSettings, ListStatus, ListComment } from '@/lib/supabase';

type ReorderableListItemProps = {
  item: ListItem;
  settings: ListSettings;
  statuses: ListStatus[];
  userVoted: boolean;
  userRating: number | null;
  averageRating: number | null;
  comments: ListComment[];
  userProfiles: Record<string, { username: string | null; email: string }>;
  onStatusChange: (status: string) => void;
  onTagsChange: (tags: string[]) => void;
  onVote: () => void;
  onRate: (rating: number) => void;
  onDelete: () => void;
  onAddComment: () => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  currentUserId?: string;
  orderNumber?: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export function ReorderableListItem({
  item,
  settings,
  statuses,
  userVoted,
  userRating,
  averageRating,
  comments,
  userProfiles,
  onStatusChange,
  onTagsChange,
  onVote,
  onRate,
  onDelete,
  onAddComment,
  onDeleteComment,
  currentUserId,
  orderNumber,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: ReorderableListItemProps) {
  return (
    <div className="flex items-stretch gap-2">
      <div className="flex flex-col gap-1 items-center justify-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="h-10 w-10 p-0 disabled:opacity-30"
          aria-label="Move up"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="h-10 w-10 p-0 disabled:opacity-30"
          aria-label="Move down"
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1">
        <ListItemCard
          item={item}
          settings={settings}
          statuses={statuses}
          userVoted={userVoted}
          userRating={userRating}
          averageRating={averageRating}
          comments={comments}
          userProfiles={userProfiles}
          onStatusChange={onStatusChange}
          onTagsChange={onTagsChange}
          onVote={onVote}
          onRate={onRate}
          onDelete={onDelete}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          currentUserId={currentUserId}
          orderNumber={orderNumber}
        />
      </div>
    </div>
  );
}
