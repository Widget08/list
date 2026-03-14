# Lists App — Product Requirements Document
 
## Overview
- **Status:** Approved (reflecting current implemented state)
- **Product:** Lists — A collaborative list management web application
- **Stack:** React + TypeScript, Supabase (Postgres + Auth), Tailwind CSS, shadcn/ui
- **PM:** Michael (Constellation Brands / DevUps)
 
---
 
## Problem Statement
 
Teams and individuals need a flexible, shareable list tool that goes beyond basic task management. Existing tools are either too rigid (single-purpose to-do apps) or too heavy (full project management suites). There is no lightweight, embeddable, feature-configurable list platform that supports community voting, ratings, comments, and public sharing without requiring all collaborators to have accounts.
 
---
 
## Goals & Success Metrics
 
| Goal | Primary Metric |
|------|---------------|
| Users can create and share lists without friction | Time-to-first-shared-list < 2 min |
| Non-members can participate in public lists | Anonymous interaction rate |
| List owners can configure features per use case | Settings adoption rate |
| Collaboration is low-barrier | Invite link redemption rate |
 
---
 
## User Roles
 
| Role | Permissions |
|------|------------|
| **Owner / Admin** | Full access: create, edit, delete, manage members, manage settings |
| **Editor** | Add, edit, delete list items; cannot access settings |
| **Viewer** | View list, vote, rate, comment (if features enabled) |
| **Anonymous** | View and interact with public (`anyone`) lists only |
 
---
 
## Core Features
 
### 1. Authentication & Accounts
 
**Problem:** Users need secure accounts to own and manage lists.
 
**Implemented:**
- Email/password sign up and sign in
- Google OAuth (sign in and account linking/unlinking)
- Forgot password / reset password via email link
- User profile with editable username (3–30 chars, alphanumeric + `-_`)
- Auto-generated username from email prefix on signup (with conflict resolution)
- Protected routes redirect unauthenticated users to sign in, then return them to original destination
 
**User Stories:**
- As a new user, I can sign up with email/password or Google so I can start creating lists immediately.
- As a returning user, I can reset my forgotten password via email link.
- As a user, I can link or unlink my Google account from my profile page.
 
---
 
### 2. List Management (Dashboard)
 
**Problem:** Users need a home base to organize their lists.
 
**Implemented:**
- Create lists with name and optional description
- Dashboard with grid layout of all accessible lists
- Filter lists by: All, Created by me, Shared with me, Public
- Search lists by name or description
- Delete lists (admins only, via popover menu)
- Navigate to list settings (admins only)
 
**User Stories:**
- As a user, I can create a new list in under 30 seconds.
- As a user, I can filter and search my lists to find what I need quickly.
- As an admin, I can delete lists I no longer need.
 
---
 
### 3. List Items
 
**Problem:** Users need to add, organize, and track items within a list.
 
**Implemented:**
- Add items with: title (required), description, URL, and initial status/tag
- URL auto-metadata fetch (title + description via microlink.io API, debounced 500ms)
- Items display: title, optional URL link icon, description, status badges
- Mark items with strikethrough when completed
- Delete items via popover "..." menu (editors/admins only)
- Item position tracking for manual ordering
 
**User Stories:**
- As an editor, I can paste a URL and have the title/description auto-populated.
- As a viewer, I can see all items in a list with their current status.
- As an editor, I can delete items I no longer need.
 
---
 
### 4. Configurable List Features (Settings)
 
**Problem:** Different use cases (backlog, watchlist, voting board, ranked list) need different features. One size does not fit all.
 
Each list has a settings panel (admin-only) that toggles features on/off:
 
| Feature | Default | Description |
|---------|---------|-------------|
| **Tag Tracking** | On | Enable status/tag labels per item |
| **Allow Multiple Tags** | Off | Let users select multiple tags per item |
| **Voting (Upvote)** | Off | Thumbs-up voting with count display |
| **Downvoting** | Off | Sub-option of voting; requires voting enabled |
| **Ratings** | Off | 1–5 star ratings per item with average displayed |
| **Shuffle** | Off | Randomize item order via button |
| **Manual Ordering** | On | Drag-and-drop reordering (editors/admins) |
| **Comments** | Off | Threaded comments per item |
 
**Sort Order Options:**
- Manual (default drag-and-drop order)
- By Votes (descending)
- By Ratings (descending average)
- Shuffled (random on load)
 
**User Stories:**
- As an admin, I can enable voting so my team can prioritize backlog items democratically.
- As an admin, I can set default sort to "By Votes" so the highest-priority items always appear first.
- As an admin, I can allow multiple tags so items can be cross-labeled across categories.
 
---
 
### 5. Tags / Statuses
 
**Problem:** Users need to categorize and track items through workflows.
 
**Implemented:**
- Admins can create, rename, reorder (drag-and-drop), and delete tags
- Default tags created per list: `backlog`, `in progress`, `done`
- Single-select mode: dropdown selector per item
- Multi-select mode: popover tag picker with checkboxes; selected tags shown as removable badges
- Tag order is persisted in database
 
**User Stories:**
- As an admin, I can customize tags to match my team's workflow (e.g., "To Watch", "Watching", "Watched").
- As an editor, I can assign a tag to an item to show its current status.
 
---
 
### 6. Voting
 
**Problem:** Teams need lightweight prioritization without complex scoring.
 
**Implemented:**
- Upvote button with count display per item
- Toggle behavior: clicking upvote again removes the vote
- Optional downvote button (enabled in settings)
- Vote switching: upvote → downvote adjusts count by 2 (removes +1, adds -1)
- Anonymous users can vote on public lists (tracked by UUID stored in localStorage)
- Sort by votes updates item order in real time when enabled
 
**User Stories:**
- As a viewer, I can upvote items I want prioritized.
- As a viewer, I can remove my vote by clicking the upvote button again.
- As an anonymous user, I can vote on a public list without creating an account.
 
---
 
### 7. Ratings
 
**Problem:** Upvotes are binary; some use cases need nuanced scoring (e.g., 1–5 stars for a movie watchlist).
 
**Implemented:**
- 5-star rating UI per item
- User's own rating highlighted in yellow
- Average rating displayed next to stars
- Rating updates immediately (upsert behavior)
- Sort by ratings updates item order in real time when enabled
- Anonymous users can rate on public lists
 
**User Stories:**
- As a viewer, I can rate an item 1–5 stars to express how strongly I feel about it.
- As any list visitor, I can see the crowd-sourced average rating for each item.
 
---
 
### 8. Comments
 
**Problem:** Voting and ratings don't capture qualitative feedback; teams need a place to discuss items.
 
**Implemented:**
- Expandable comments panel per item (toggled by comment count button)
- Add comments via textarea (submit with button or Cmd/Ctrl+Enter)
- Comment shows: display name (username or email prefix), timestamp, comment text
- Authors can delete their own comments (trash icon)
- Comment count badge on toggle button
- Requires authentication (sign-in prompt shown to logged-out users)
 
**User Stories:**
- As a viewer, I can leave a comment on an item to share context or feedback.
- As a commenter, I can delete my own comment if I change my mind.
- As any user, I can read all comments to understand the discussion around an item.
 
---
 
### 9. Manual Ordering & Drag-and-Drop
 
**Problem:** Users want to curate the sequence of items (e.g., ranked lists, step-by-step guides).
 
**Implemented:**
- "Reorder" toggle in list header activates drag-and-drop mode (editors/admins only)
- Drag handle (grip icon) appears on left of each item when reorder mode is active
- Uses `@dnd-kit` with pointer, touch, and keyboard sensor support
- Position saved to database on drag-end
- Optional order number display (`#1`, `#2`, etc.) when ordering is enabled
- Shuffle button randomizes and persists a new order
 
**User Stories:**
- As an editor, I can drag items into my preferred sequence and the order is saved.
- As an admin, I can shuffle the list for a randomized experience (e.g., random movie picker).
- As a mobile user, I can reorder items using touch drag with a 150ms delay activation.
 
---
 
### 10. Sharing & Access Control
 
**Problem:** Collaborators need controlled access; public lists need to be viewable without an account.
 
**Public Access Modes** (set per list):
 
| Mode | Who Can View |
|------|-------------|
| **None** | Only explicit members |
| **Any Authenticated User** | Any signed-in user gets view access |
| **Anyone with Link** | Full public access, no login required |
 
**Member-Based Sharing:**
- Search users by username or email to add directly
- Assign role (View / Edit / Admin) per member
- Update or remove member roles from the share dialog
- Copyable share link
 
**Invite Links:**
- Create shareable invite links with a designated role
- Usage count tracked
- Multiple active links supported per list
- Delete/revoke links
- New users who sign up via an invite link are automatically added to the list
 
**User Stories:**
- As an admin, I can make my list public so anyone with the URL can view and vote without signing up.
- As an admin, I can generate an invite link to send to collaborators who don't have accounts yet.
- As a new user, I can click an invite link, create an account, and automatically join the list.
- As an admin, I can remove a collaborator's access or change their role at any time.
 
---
 
## Data Model Summary
 
```
lists
  ├── list_settings (1:1)
  ├── list_statuses (1:many) — tags/statuses
  ├── list_members (1:many) — roles: view, edit, admin
  ├── list_invite_links (1:many)
  └── list_items (1:many)
        ├── list_votes (1:many)
        ├── list_ratings (1:many)
        └── list_item_comments (1:many)
 
user_profiles (1:1 with auth.users)
```
 
---
 
## Non-Functional Requirements
 
| Requirement | Implementation |
|-------------|---------------|
| Mobile responsive | Tailwind responsive classes; touch sensor for drag-and-drop |
| Anonymous participation | UUID stored in localStorage (`anonymous_user_id`) |
| Real-time sort | Client-side re-sort on vote/rating change |
| URL metadata | Debounced fetch via microlink.io on URL input |
| Row-level security | Supabase RLS with helper functions (`user_has_list_access`, `user_is_list_admin`, `user_can_edit_list`) |
| Auth redirects | `returnTo` state passed through sign-in/sign-up flows |
 
---
 
## Out of Scope (Future Opportunities)
 
- Real-time collaborative updates (Supabase Realtime subscriptions)
- Comment threads / replies
- Item due dates or scheduling
- Notifications (email or in-app) on new votes/comments
- List templates
- CSV/JSON import/export
- Embeddable widget for external sites
- Mobile native app
- Admin analytics dashboard (item engagement, voter breakdown)
- OAuth providers beyond Google (GitHub, etc.)
 
---
 
## Open Questions
 
| Question | Owner | Status |
|----------|-------|--------|
| Should anonymous votes persist across sessions/devices? | PM | Open |
| Should invite links have default expiration? | PM | Open |
| Should editors be able to add comments even when comments are disabled in settings? | PM | Open |
| Should list owners receive notifications when someone joins via invite link? | PM | Open |
