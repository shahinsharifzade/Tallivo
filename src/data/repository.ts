import type { Expense, Id, IsoDateTime, Meetup, Member, Settlement } from '../domain';

/** Fields the caller provides on create; the repository assigns id and timestamps. */
export type MemberInput = Pick<Member, 'name' | 'sortOrder'>;
export type MeetupInput = Pick<Meetup, 'title' | 'date' | 'note'>;
export type ExpenseInput = Pick<
  Expense,
  'meetupId' | 'title' | 'totalMinor' | 'paidByMemberId' | 'shares' | 'note'
>;
export type SettlementInput = Pick<
  Settlement,
  'fromMemberId' | 'toMemberId' | 'amountMinor' | 'date' | 'note'
>;

export const CURRENT_SCHEMA_VERSION = 1;

/** A full copy of all data. Used for export/import and as the localStorage payload. */
export interface Snapshot {
  schemaVersion: number;
  members: Member[];
  meetups: Meetup[];
  expenses: Expense[];
  settlements: Settlement[];
}

/**
 * Storage abstraction. The UI and state layer depend only on this interface, so a
 * SupabaseRepository can replace LocalStorageRepository without touching components.
 *
 * Conventions:
 * - list* methods return ALL rows, including soft-deleted ones (callers filter).
 * - softDelete* sets deletedAt (optionally to a given timestamp so related rows can share it);
 *   restore* clears it.
 * - Members are hard-deleted, and only when no expense or settlement references them.
 * - Methods reject with AppError ('notFound', 'memberInUse', 'storageWrite', ...).
 */
export interface Repository {
  listMembers(): Promise<Member[]>;
  createMember(input: MemberInput): Promise<Member>;
  updateMember(id: Id, patch: Partial<MemberInput>): Promise<Member>;
  deleteMember(id: Id): Promise<void>;

  listMeetups(): Promise<Meetup[]>;
  createMeetup(input: MeetupInput): Promise<Meetup>;
  updateMeetup(id: Id, patch: Partial<MeetupInput>): Promise<Meetup>;
  softDeleteMeetup(id: Id, deletedAt?: IsoDateTime): Promise<void>;
  restoreMeetup(id: Id): Promise<void>;

  listExpenses(): Promise<Expense[]>;
  createExpense(input: ExpenseInput): Promise<Expense>;
  updateExpense(id: Id, patch: Partial<ExpenseInput>): Promise<Expense>;
  softDeleteExpense(id: Id, deletedAt?: IsoDateTime): Promise<void>;
  restoreExpense(id: Id): Promise<void>;

  listSettlements(): Promise<Settlement[]>;
  createSettlement(input: SettlementInput): Promise<Settlement>;
  updateSettlement(id: Id, patch: Partial<SettlementInput>): Promise<Settlement>;
  softDeleteSettlement(id: Id, deletedAt?: IsoDateTime): Promise<void>;
  restoreSettlement(id: Id): Promise<void>;

  /** Returns a full copy of all data. */
  exportSnapshot(): Promise<Snapshot>;
  /** Replaces ALL data with the given (already validated) snapshot. */
  replaceAll(snapshot: Snapshot): Promise<void>;
  /** Deletes all data. */
  clearAll(): Promise<void>;
}
