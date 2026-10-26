import { isAppError } from '../data/errors';
import { az } from '../i18n/az';

/** Maps any thrown value to a user-facing Azerbaijani message. */
export function errorMessage(e: unknown): string {
  if (isAppError(e)) return az.errors[e.code];
  return az.errors.unknown;
}
