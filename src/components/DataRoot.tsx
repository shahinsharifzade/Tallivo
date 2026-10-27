import { AppDataProvider } from '../state/AppDataProvider';
import { useBackend } from '../state/backend';
import { AppLayout } from './AppLayout';
import { AuthGate } from './AuthGate';

/** Layout route for all data screens: local storage directly, or Supabase behind sign-in. */
export function DataRoot() {
  const backend = useBackend();

  if (backend.mode === 'local') {
    return (
      <AppDataProvider repository={backend.repository}>
        <AppLayout />
      </AppDataProvider>
    );
  }

  return (
    <AuthGate client={backend.client}>
      {(userId) => (
        // Keyed by user so signing in as someone else starts from an empty state.
        <AppDataProvider key={userId} repository={backend.repository} seedOnFirstRun={false}>
          <AppLayout />
        </AppDataProvider>
      )}
    </AuthGate>
  );
}
