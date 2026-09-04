import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for Client Components ("use client").
 *
 * Uses the anon key only. Every query it makes is filtered by RLS, so the worst
 * a hostile browser can do with it is read its own rows.
 *
 * IMPORT THIS WITH `await import()` FROM AN EVENT HANDLER, NOT AT MODULE SCOPE,
 * unless the page cannot function until it has loaded.
 *
 * supabase-js pulls in GoTrue *and* the Realtime client, and Realtime imports
 * its websocket transport statically — nothing tree-shakes it out, and this app
 * never opens a subscription. Statically imported it lands in the route's first
 * load as ~185 KB of JavaScript that a student on mobile data pays for before
 * the page is interactive, to support a button they may never press.
 *
 * Deferred, that cost moves to the moment of the tap, where a few hundred
 * milliseconds is invisible next to the network round trip that follows anyway.
 * The exception is the auth screens: someone on /login is there to press the
 * button, so LoginForm and RegisterForm import it eagerly on purpose.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
