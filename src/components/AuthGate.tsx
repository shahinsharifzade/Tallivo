import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { fetchLinkedMemberName } from '../data/supabaseRepository';
import { az } from '../i18n/az';
import { LoginPage } from '../pages/LoginPage';
import { AccountContext, type Account } from '../state/backend';
import { errorMessage } from '../state/errorMessage';
import { Logo } from './Logo';
import { buttonClass } from './styles';
import { Card } from './ui';

const t = az.auth;

type LinkResult =
  | { status: 'linked'; memberName: string }
  | { status: 'notLinked' }
  | { status: 'error'; message: string };

/** Result of the member lookup, tagged with the user it belongs to. */
type Link = LinkResult & { userId: string };

/** Centered single-card screen with the logo, used for sign-in and account states. */
function GateScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card className="page-in">{children}</Card>
      </div>
    </div>
  );
}

/**
 * Renders children only for a signed-in user who is linked to a group member. Until then no
 * data screen is mounted, so no data query runs. `children` receives the user id so callers can
 * key per-user state (a different login never sees the previous user's loaded data).
 */
export function AuthGate({
  client,
  children,
}: {
  client: SupabaseClient;
  children: (userId: string) => ReactNode;
}) {
  // undefined: still reading the stored session.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [storedLink, setLink] = useState<Link | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    client.auth
      .getSession()
      .then(({ data }) => active && setSession(data.session))
      .catch(() => active && setSession(null));
    const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const userId = session?.user.id;
  const email = session?.user.email ?? '';

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLink(null);
    fetchLinkedMemberName(client, userId)
      .then((name) => {
        if (cancelled) return;
        setLink(
          name === null
            ? { userId, status: 'notLinked' }
            : { userId, status: 'linked', memberName: name },
        );
      })
      .catch((e: unknown) => {
        console.error('[tallivo] Failed to check the member link', e);
        if (!cancelled) setLink({ userId, status: 'error', message: errorMessage(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [client, userId, attempt]);

  const signOut = useCallback(async () => {
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) console.error('[tallivo] Sign-out failed', error);
    } catch (e) {
      console.error('[tallivo] Sign-out failed', e);
    } finally {
      // Show the sign-in screen (and drop all loaded data) even if the request failed.
      setSession(null);
    }
  }, [client]);

  // A lookup for a previous user (or none yet) counts as still loading.
  const link = storedLink && storedLink.userId === userId ? storedLink : null;

  const account = useMemo<Account | null>(
    () => (link?.status === 'linked' ? { memberName: link.memberName, signOut } : null),
    [link, signOut],
  );

  if (session === undefined || (session && !link)) {
    return (
      <GateScreen>
        <p className="py-6 text-center text-ink-muted">{t.checking}</p>
      </GateScreen>
    );
  }

  if (!session || !userId || !link) {
    return (
      <GateScreen>
        <LoginPage client={client} />
      </GateScreen>
    );
  }

  if (link.status === 'notLinked' || link.status === 'error') {
    return (
      <GateScreen>
        <div role="alert" className="space-y-2">
          <h1 className="text-lg font-bold">
            {link.status === 'notLinked' ? t.notLinkedTitle : t.linkErrorTitle}
          </h1>
          <p className="text-sm text-ink-soft">
            {link.status === 'notLinked' ? t.notLinkedBody(email) : link.message}
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          {link.status === 'error' && (
            <button
              type="button"
              className={buttonClass('primary', 'flex-1')}
              onClick={() => setAttempt((n) => n + 1)}
            >
              {az.app.retry}
            </button>
          )}
          <button type="button" className={buttonClass('secondary', 'flex-1')} onClick={signOut}>
            {t.signOut}
          </button>
        </div>
      </GateScreen>
    );
  }

  return <AccountContext.Provider value={account}>{children(userId)}</AccountContext.Provider>;
}
