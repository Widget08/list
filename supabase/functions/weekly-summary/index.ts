import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ListStat {
  name: string;
  item_count: number;
  completed_count: number;
}

interface UserStats {
  total_lists: number;
  total_items: number;
  completed_items: number;
  items_added_this_week: number;
  lists: ListStat[];
}

interface UserProfile {
  id: string;
  email: string;
  username: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY secret is not configured');
    }

    // Get all users who opted in to weekly summary emails
    const { data: optedInUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, email, username')
      .eq('weekly_summary_enabled', true);

    if (usersError) throw usersError;

    if (!optedInUsers || optedInUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users opted in to weekly summaries' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let sent = 0;
    let failed = 0;

    for (const profile of optedInUsers as UserProfile[]) {
      try {
        const { data: stats, error: statsError } = await supabase
          .rpc('get_user_weekly_stats', { p_user_id: profile.id });

        if (statsError) throw statsError;

        const html = buildEmailHtml(profile.username || profile.email, stats as UserStats);

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Weekly Summary <noreply@resend.dev>',
            to: profile.email,
            subject: `Your Weekly List Summary — ${stats.total_items} items across ${stats.total_lists} lists`,
            html,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Failed to send to ${profile.email}: ${errText}`);
          failed++;
        } else {
          sent++;
        }
      } catch (err) {
        console.error(`Error processing user ${profile.id}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ sent, failed, total: optedInUsers.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

function buildEmailHtml(name: string, stats: UserStats): string {
  const listRows = stats.lists.map((list) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #eee;">${escapeHtml(list.name)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #eee;text-align:center;">${list.item_count}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #eee;text-align:center;">${list.completed_count}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="background:#0f172a;padding:32px 24px;">
        <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Your Weekly Summary</h1>
        <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Hi ${escapeHtml(name)}, here's how your lists are doing this week.</p>
      </div>
      <div style="padding:24px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
          <div style="background:#f1f5f9;border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:32px;font-weight:700;color:#0f172a;">${stats.total_lists}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Total Lists</div>
          </div>
          <div style="background:#f1f5f9;border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:32px;font-weight:700;color:#0f172a;">${stats.total_items}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Total Items</div>
          </div>
          <div style="background:#f1f5f9;border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:32px;font-weight:700;color:#16a34a;">${stats.completed_items}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Completed Items</div>
          </div>
          <div style="background:#f1f5f9;border-radius:8px;padding:16px;text-align:center;">
            <div style="font-size:32px;font-weight:700;color:#2563eb;">${stats.items_added_this_week}</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Added This Week</div>
          </div>
        </div>
        ${stats.lists.length > 0 ? `
        <h2 style="font-size:16px;font-weight:600;color:#0f172a;margin:0 0 12px;">Per-List Breakdown</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:10px 16px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;">List Name</th>
              <th style="padding:10px 16px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;">Items</th>
              <th style="padding:10px 16px;text-align:center;font-size:12px;color:#64748b;text-transform:uppercase;">Done</th>
            </tr>
          </thead>
          <tbody>${listRows}</tbody>
        </table>
        ` : '<p style="color:#64748b;font-size:14px;">You don\'t have any lists yet. Create one to get started!</p>'}
      </div>
      <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">You received this email because you enabled weekly summary emails in your profile settings.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
