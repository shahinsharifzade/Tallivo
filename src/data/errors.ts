export type AppErrorCode =
  | 'notFound'
  | 'storageWrite'
  | 'memberInUse'
  | 'invalidMemberName'
  | 'invalidMeetup'
  | 'invalidExpense'
  | 'invalidSettlement'
  | 'meetupDeleted'
  | 'importInvalid';

/** Error with a stable code that the UI maps to a localized message. */
export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = 'AppError';
    this.code = code;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
