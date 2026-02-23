import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListStatus } from '@/lib/supabase';
import { fetchUrlMetadata, isValidUrl } from '@/lib/urlMetadata';
import { Loader2 } from 'lucide-react';

type QuickAddItemProps = {
  statuses: ListStatus[];
  onAdd: (data: { title: string; description: string; url: string; status: string }) => Promise<void>;
  onCancel: () => void;
  enableStatus: boolean;
};

export function QuickAddItem({ statuses, onAdd, onCancel, enableStatus }: QuickAddItemProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(statuses[0]?.name || 'backlog');
  const [loading, setLoading] = useState(false);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (isValidUrl(url)) {
        setFetchingMetadata(true);
        const metadata = await fetchUrlMetadata(url);
        if (metadata.title && !title) {
          setTitle(metadata.title);
        }
        if (metadata.description && !description) {
          setDescription(metadata.description);
        }
        setFetchingMetadata(false);
      }
    };

    const debounceTimer = setTimeout(fetchMetadata, 500);
    return () => clearTimeout(debounceTimer);
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    await onAdd({ title, description, url, status });
    setLoading(false);
    setUrl('');
    setTitle('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white border border-slate-200 rounded-lg">
      <div className="space-y-2">
        <Label htmlFor="url">URL (optional)</Label>
        <div className="relative">
          <Input
            id="url"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          {fetchingMetadata && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-slate-400" />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Item title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Additional details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          rows={2}
        />
      </div>

      {enableStatus && statuses.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus} disabled={loading}>
            <SelectTrigger>
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
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !title.trim()}>
          {loading ? 'Adding...' : 'Add Item'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
