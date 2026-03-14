import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ListItemCard } from './ListItemCard';
import { ListItem, ListSettings, ListStatus, ListComment } from '@/lib/supabase';

type SortableListItemProps = {
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
  currentUserId?: string;
  orderNumber?: number;
  canReorder: boolean;
  canEdit?: boolean;
};

export function SortableListItem({
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
  currentUserId,
  orderNumber,
  canReorder,
  canEdit = true,
}: SortableListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const showDragHandle = settings.enable_ordering && canReorder;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        userSelect: isDragging ? 'none' : undefined,
        WebkitUserSelect: isDragging ? 'none' : undefined,
      }}
      className="flex items-stretch"
    >
      {showDragHandle && (
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-10 sm:w-8 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors rounded-l-lg hover:bg-slate-100 active:bg-slate-200 select-none touch-none bg-slate-50 border-y border-l border-slate-200"
          style={{
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
          }}
          role="button"
          aria-label="Drag to reorder"
          tabIndex={0}
        >
          <GripVertical className="h-5 w-5" />
        </div>
      )}
      <div className={`flex-1 ${showDragHandle ? '' : ''}`}>
        <ListItemCard
          item={item}
          settings={settings}
          statuses={statuses}
          userVoted={userVoted}
          userDownvoted={userDownvoted}
          userRating={userRating}
          averageRating={averageRating}
          comments={comments}
          userProfiles={userProfiles}
          onStatusChange={onStatusChange}
          onTagsChange={onTagsChange}
          onVote={onVote}
          onDownvote={onDownvote}
          onRate={onRate}
          onDelete={onDelete}
          onEdit={onEdit}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          currentUserId={currentUserId}
          orderNumber={orderNumber}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
