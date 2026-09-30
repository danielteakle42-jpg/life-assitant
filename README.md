# Platinum Assistant

A multi-user personal assistant built with Next.js + Supabase. Each signed-in user owns their own tasks, meetings, projects, notes, contacts, recruitment, trends, email drafts and integration tokens under Supabase RLS.

## Real connections included

- Google OAuth: Gmail inbox, Gmail sending, Google Calendar read/create, Google Drive read-only
- Lark OAuth: user identity/token connection and calendar discovery
- Discord: per-user channel webhook connection + test message
- Browser notifications: real Notification permission + service worker registration

No AI email-writing API is included.

## Required setup

1. Copy `.env.example` to `.env.local` and enter the Supabase publishable key.
2. Set `ADMIN_SESSION_SECRET` and `TOKEN_ENCRYPTION_KEY` to long random values.
3. Google: create a Web OAuth client, enable Gmail API, Google Calendar API and Google Drive API, and add:
   - Local callback: `http://localhost:3000/api/integrations/google/callback`
   - Production callback: `https://YOUR-DOMAIN/api/integrations/google/callback`
4. Lark: create a custom app, copy App ID/App Secret, enable the user/calendar permissions you need, and add:
   - Local callback: `http://localhost:3000/api/integrations/lark/callback`
   - Production callback: `https://YOUR-DOMAIN/api/integrations/lark/callback`
5. Discord needs no app credentials for the current integration. Paste a channel webhook URL on the Connections page.

## Security

OAuth access/refresh tokens and Discord webhook URLs are encrypted with AES-GCM before being saved. Supabase RLS restricts integration rows to the signed-in `auth.uid()`.
