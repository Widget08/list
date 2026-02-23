import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type List = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  public_access_mode: 'none' | 'members' | 'anyone';
  share_token: string;
  created_at: string;
  updated_at: string;
};

export type ListItem = {
  id: string;
  list_id: string;
  user_id: string;
  title: string;
  description: string;
  url: string;
  status: string;
  tags: string[];
  completed: boolean;
  position: number;
  upvotes: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type ListSettings = {
  id: string;
  list_id: string;
  enable_status: boolean;
  enable_voting: boolean;
  enable_downvote: boolean;
  enable_rating: boolean;
  enable_shuffle: boolean;
  enable_ordering: boolean;
  enable_comments: boolean;
  allow_multiple_tags: boolean;
  sort_by: 'manual' | 'votes' | 'ratings' | 'shuffle';
  created_at: string;
  updated_at: string;
};

export type ListStatus = {
  id: string;
  list_id: string;
  name: string;
  position: number;
  created_at: string;
};

export type ListRating = {
  id: string;
  list_item_id: string;
  user_id: string;
  rating: number;
  created_at: string;
  updated_at: string;
};

export type ListComment = {
  id: string;
  list_item_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
};

export type ListMember = {
  id: string;
  list_id: string;
  user_id: string;
  role: 'view' | 'edit' | 'admin';
  invited_by: string | null;
  created_at: string;
};

export type UserProfile = {
  id: string;
  username: string | null;
  email: string;
  created_at: string;
  updated_at: string;
};

export type ListVote = {
  id: string;
  list_item_id: string;
  user_id: string;
  vote_type: number;
  created_at: string;
};

export type ListInviteLink = {
  id: string;
  list_id: string;
  created_by: string;
  role: 'view' | 'edit' | 'admin';
  token: string;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  created_at: string;
  updated_at: string;
};
