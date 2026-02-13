# ☁️ Supabase Integration Plan (Free Tier)

## 🎯 Objective

Migrate "Memory Tree" from `localStorage` to **Supabase** to persist data across devices and users, while staying strictly within **Free Tier** limits. Host the frontend on **Vercel**.

## 💰 Free Tier Strategy

| Component | Provider | Free Limit | Strategy |
|-----------|----------|------------|----------|
| **Frontend** | Vercel | Unlimited bandwidth (fair use) | Standard React deployment. |
| **Database** | Supabase | 500MB | Store **metadata only** (text). Images go to Storage. |
| **Images** | Supabase Storage | 1GB | **CRITICAL:** Upload images as files, store `publicUrl` in DB. Do NOT store Base64 in DB (it wastes space & performance). |
| **Auth** | Supabase Auth | 50,000 MAU | Replace hardcoded password with secure Email/Password login. |

---

## 🛠️ Implementation Steps

### 1. 🗄️ Database & Storage Setup (User Action Required)

You will need to create a project at [supabase.com](https://supabase.com).

#### **A. SQL Schema**

Run this in Supabase SQL Editor:

```sql
-- 1. Create table
create table public.memories (
  id uuid default gen_random_uuid() primary key,
  label text not null,
  year text not null,
  image_url text not null, -- Stores the public URL from Storage
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.memories enable row level security;

-- 3. Policies
-- Everyone can view memories
create policy "Public Memories are viewable by everyone"
  on public.memories for select
  using ( true );

-- Only authenticated (Admin) users can insert/update/delete
create policy "Admins can insert memories"
  on public.memories for insert
  to authenticated
  with check ( true );

create policy "Admins can update memories"
  on public.memories for update
  to authenticated
  using ( true );

create policy "Admins can delete memories"
  on public.memories for delete
  to authenticated
  using ( true );
```

#### **B. Storage Bucket**

1. Create a new bucket named `memory-images`.
2. Toggle "Public" to **ON**.
3. Add Policy:
   - SELECT: Public (Enable logic for "Give users access to protected files" or just set bucket public).
   - INSERT/UPDATE/DELETE: Authenticated users only.

---

### 2. 🔌 Frontend Integration

#### **A. Dependencies**

```bash
npm install @supabase/supabase-js
```

#### **B. Environment Variables**

Create `.env` (local) and add to Vercel Project Settings:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### **C. Supabase Client (`src/lib/supabase.ts`)**

Initialize the client using the env vars.

### 3. 🔄 Code Migration

#### **A. Refactor `useTreeMemories.ts`**

- **Read:** Replace `localStorage.getItem` with `supabase.from('memories').select('*')`.
- **Create:**
  1. Upload image file to Storage bucket: `supabase.storage.from('memory-images').upload(...)`.
  2. Get public URL.
  3. Insert record to DB: `supabase.from('memories').insert({ label, year, image_url: publicUrl })`.
- **Delete:**
  1. Delete DB record.
  2. (Optional) clean up file from storage.

#### **B. Refactor `useAppStore.ts`**

- Remove `adminPassword` (insecure).
- Add `user` session state from Supabase Auth.

#### **C. Refactor `AdminPanel.tsx`**

- Replace simple password check with `supabase.auth.signInWithPassword`.
- Add "Sign Out" button.

---

## 🚀 Deployment (Vercel)

1. Push code to GitHub.
2. Import project in Vercel.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel Environment Variables.
4. Deploy!

## ✅ Verification Checklist

- [ ] Memories load from remote DB.
- [ ] Images load from remote Storage.
- [ ] Admin login works with email/password.
- [ ] Public users (unauthenticated) CANNOT edit/delete.
