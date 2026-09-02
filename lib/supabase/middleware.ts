import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options: CookieOptions }

/**
 * True when the request never reached Supabase at all — DNS failure, no network,
 * or a project that has been paused or deleted.
 *
 * This is deliberately distinct from "not signed in". A real signed-out answer
 * carries an HTTP status; `AuthRetryableFetchError` with `status: 0` means no
 * response came back, so we know nothing about the session either way.
 */
function isBackendUnreachable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const { name, status, message } = error as {
    name?: string
    status?: number
    message?: string
  }

  return (
    name === 'AuthRetryableFetchError' ||
    status === 0 ||
    /fetch failed|network|enotfound|econnrefused/i.test(message ?? '')
  )
}

/** Pages that a signed-out visitor is allowed to see. */
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/auth']

/** Pages that make no sense once you are already signed in. */
const SIGNED_IN_REDIRECTS = ['/login', '/register', '/forgot-password']

/**
 * Redirect WITHOUT losing the session cookies.
 *
 * getUser() above may have rotated the access/refresh token pair, in which case
 * the Supabase client wrote the new pair onto `carrying` via setAll(). A bare
 * NextResponse.redirect() is a brand-new response, so those Set-Cookie headers
 * would simply never be sent — the browser would keep a refresh token that the
 * server has already spent.
 *
 * That fails on the *next* request, not this one, which is what makes it so
 * confusing from the outside: the user is bounced to /login at random, usually
 * about an hour after signing in, and the 307 that did it looks perfectly
 * ordinary in the network tab.
 */
function redirectPreservingCookies(url: URL, carrying: NextResponse) {
  // Use 303 See Other to force a GET request on the new location. This is
  // the correct behavior for login redirects, especially after a POST.
  // A 307 would preserve the method, which could lead to a POST to /login.
  // See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/303
  const redirect = NextResponse.redirect(url, 303)

  for (const cookie of carrying.cookies.getAll()) {
    redirect.cookies.set(cookie)
  }

  return redirect
}

/**
 * Refreshes the Supabase session cookie on every request (tokens are short-lived)
 * and bounces signed-out users to /login.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )

  // API routes answer with their own 401 JSON; never redirect them to an HTML
  // login page, or fetch() callers would silently get a 200 + login markup.
  const isApi = pathname.startsWith('/api/')

  // Do not remove: this call is what actually refreshes the token.
  //
  // Depending on the version, a network failure here either throws or comes back
  // in `error`, so both have to be handled. Letting one escape would 500 *every*
  // route this matcher covers — including /login — so a Supabase outage would
  // take the whole site down with no page left to explain why.
  let user = null
  let failure: unknown = null

  try {
    const { data, error } = await supabase.auth.getUser()
    user = data.user
    failure = error
  } catch (thrown) {
    failure = thrown
  }

  if (isBackendUnreachable(failure)) {
    console.error('[middleware] Supabase ติดต่อไม่ได้:', failure)

    // We could not verify the session, so we must not treat the visitor as
    // signed in. Public pages and API routes still get to answer for
    // themselves; everything else goes to /login, which renders fine and can
    // say what actually happened.
    if (isPublic || isApi) return response

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('error', 'backend_unreachable')
    return redirectPreservingCookies(url, response)
  }

  if (!user && !isPublic && !isApi) {
    // Where to send them back to, query string and all. Read before the clone
    // is cleared, because that is the only copy of it left.
    const returnTo = `${pathname}${request.nextUrl.search}`

    const url = request.nextUrl.clone()
    // clone() carries over the search params of the page we came from, so they
    // have to go before /login's own are added — otherwise a bounce from
    // /leaderboard?tab=faculty hands /login a stray `tab`, and the params of
    // every subsequent bounce pile up on top of it.
    url.search = ''
    url.pathname = '/login'
    url.searchParams.set('next', returnTo)
    return redirectPreservingCookies(url, response)
  }

  // /reset-password is deliberately NOT in this list: you arrive there *with* a
  // session (the recovery link creates one) and still need to see the form.
  if (user && SIGNED_IN_REDIRECTS.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return redirectPreservingCookies(url, response)
  }

  return response
}
