import { useState, type FormEvent } from 'react';
import {
  isAuthApiError,
  isAuthRetryableFetchError,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { buttonClass, inputClass } from '../components/styles';
import { ErrorText, Field } from '../components/ui';
import { az } from '../i18n/az';

const t = az.auth;

function loginErrorMessage(error: unknown): string {
  if (isAuthRetryableFetchError(error)) return t.errors.network;
  if (isAuthApiError(error)) {
    if (error.status === 429) return t.errors.tooManyRequests;
    if (error.code === 'invalid_credentials' || error.status === 400) {
      return t.errors.wrongCredentials;
    }
  }
  if (error instanceof TypeError) return t.errors.network;
  return t.errors.unknown;
}

/** Email + password sign-in. No sign-up or password reset: accounts are made by the admin. */
export function LoginPage({ client }: { client: SupabaseClient }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    if (!email.trim() || !password) {
      setError(t.errors.missingFields);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { error: authError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      // On success the auth gate receives the new session and replaces this screen.
      if (authError) setError(loginErrorMessage(authError));
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-bold">{t.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t.subtitle}</p>
      </div>
      <Field id="login-email" label={t.email}>
        <input
          id="login-email"
          className={inputClass}
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field id="login-password" label={t.password}>
        <input
          id="login-password"
          className={inputClass}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      <button type="submit" className={buttonClass('primary', 'w-full')} disabled={pending}>
        {pending ? t.submitting : t.submit}
      </button>
      <p className="text-center text-sm text-ink-muted">{t.adminHint}</p>
    </form>
  );
}
