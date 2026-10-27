import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Expense, ExpenseShare, Id, IsoDateTime, Meetup, Member, Settlement } from '../domain';
import { nowIso } from '../lib/dates';
import { AppError, type AppErrorCode } from './errors';
import {
  CURRENT_SCHEMA_VERSION,
  type ExpenseInput,
  type MeetupInput,
  type MemberInput,
  type Repository,
  type SettlementInput,
  type Snapshot,
} from './repository';

// ---- row shapes (snake_case, as stored in Postgres; see supabase/schema.sql) ----

interface MemberRow {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
}

interface MeetupRow {
  id: string;
  title: string;
  date: string;
  note: string | null;
  created_at: string;
  deleted_at: string | null;
}

interface ShareRow {
  member_id: string;
  amount_minor: unknown;
}

interface ExpenseRow {
  id: string;
  meetup_id: string;
  title: string;
  total_minor: unknown;
  paid_by_member_id: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  expense_shares: ShareRow[];
}

interface SettlementRow {
  id: string;
  from_member_id: string;
  to_member_id: string;
  amount_minor: unknown;
  date: string;
  note: string | null;
  created_at: string;
  deleted_at: string | null;
}

const MEMBER_COLUMNS = 'id, name, color, sort_order, created_at';
const MEETUP_COLUMNS = 'id, title, date, note, created_at, deleted_at';
const EXPENSE_COLUMNS =
  'id, meetup_id, title, total_minor, paid_by_member_id, note, created_at, updated_at, deleted_at, expense_shares (member_id, amount_minor)';
const SETTLEMENT_COLUMNS =
  'id, from_member_id, to_member_id, amount_minor, date, note, created_at, deleted_at';

type SoftDeletable = 'meetups' | 'expenses' | 'settlements';

// ---- mapping ----

/** Postgres returns "…+00:00" with microseconds; normalize so string comparisons stay valid. */
function iso(value: string): IsoDateTime {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new AppError('badServerData', `timestamp ${value}`);
  return d.toISOString();
}

function optionalIso(value: string | null): IsoDateTime | undefined {
  return value === null ? undefined : iso(value);
}

/** bigint columns arrive as JSON numbers; reject anything that is not an exact integer. */
function minor(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new AppError('badServerData', `money ${String(value)}`);
  }
  return value;
}

function toMember(r: MemberRow): Member {
  return {
    id: r.id,
    name: r.name,
    sortOrder: r.sort_order,
    color: r.color ?? undefined,
    createdAt: iso(r.created_at),
  };
}

function toMeetup(r: MeetupRow): Meetup {
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    note: r.note ?? undefined,
    createdAt: iso(r.created_at),
    deletedAt: optionalIso(r.deleted_at),
  };
}

function toExpense(r: ExpenseRow): Expense {
  const shares: ExpenseShare[] = r.expense_shares.map((s) => ({
    memberId: s.member_id,
    amountMinor: minor(s.amount_minor),
  }));
  return {
    id: r.id,
    meetupId: r.meetup_id,
    title: r.title,
    totalMinor: minor(r.total_minor),
    paidByMemberId: r.paid_by_member_id,
    shares,
    note: r.note ?? undefined,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    deletedAt: optionalIso(r.deleted_at),
  };
}

function toSettlement(r: SettlementRow): Settlement {
  return {
    id: r.id,
    fromMemberId: r.from_member_id,
    toMemberId: r.to_member_id,
    amountMinor: minor(r.amount_minor),
    date: r.date,
    note: r.note ?? undefined,
    createdAt: iso(r.created_at),
    deletedAt: optionalIso(r.deleted_at),
  };
}

// ---- errors ----

/** Error codes raised by save_expense (message prefix before ":"). */
const RPC_ERRORS: Record<string, AppErrorCode> = {
  invalid_input: 'invalidExpense',
  missing_meetup: 'invalidExpense',
  missing_title: 'invalidExpense',
  invalid_total: 'invalidExpense',
  missing_payer: 'invalidExpense',
  no_shares: 'invalidExpense',
  invalid_share: 'invalidExpense',
  duplicate_share_member: 'invalidExpense',
  shares_sum_mismatch: 'invalidExpense',
  meetup_not_found: 'notFound',
  payer_not_found: 'notFound',
  share_member_not_found: 'notFound',
  expense_not_found: 'notFound',
};

/** Maps a PostgREST error to an AppError the UI can show in Azerbaijani. */
function toAppError(error: PostgrestError, status: number, fallback: AppErrorCode): AppError {
  const code = error.code ?? '';
  const detail = `${code} ${error.message}`.trim();
  // status 0: the request never reached the server (offline, DNS, CORS, paused project).
  if (status === 0 || (status >= 500 && !code)) return new AppError('network', detail);
  if (code === '42501' || code.startsWith('PGRST30') || status === 401 || status === 403) {
    return new AppError('notAllowed', detail);
  }
  if (code === 'PGRST116' || code === '23503') return new AppError('notFound', detail);
  if (code === '23505') return new AppError('invalidMemberName', detail);
  if (code === 'P0001') {
    const prefix = error.message.split(':', 1)[0] ?? '';
    const mapped = RPC_ERRORS[prefix];
    if (mapped) return new AppError(mapped, detail);
  }
  return new AppError(fallback, detail);
}

interface Result<T> {
  data: T | null;
  error: PostgrestError | null;
  status: number;
}

/** Unwraps a query result, throwing a mapped AppError on failure or missing data. */
function unwrap<T>(res: Result<T>, fallback: AppErrorCode): T {
  if (res.error) throw toAppError(res.error, res.status, fallback);
  if (res.data === null) throw new AppError('badServerData', 'empty response');
  return res.data;
}

/**
 * Name of the member linked to this login (members.user_id), or null when the account is not
 * linked. Unlinked users cannot read members at all (RLS), so they also get null.
 */
export async function fetchLinkedMemberName(
  client: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const res = await client.from('members').select('name').eq('user_id', userId).maybeSingle();
  if (res.error) throw toAppError(res.error, res.status, 'notAllowed');
  const row = res.data as { name: string } | null;
  return row?.name ?? null;
}

function noteValue(note: string | undefined): string | null {
  return note ?? null;
}

/**
 * Repository backed by the shared Supabase database. Access control lives in the database
 * (Row Level Security); this class only maps rows and errors. Nothing is hard-deleted.
 */
export class SupabaseRepository implements Repository {
  constructor(private readonly client: SupabaseClient) {}

  private async setDeletedAt(
    table: SoftDeletable,
    id: Id,
    deletedAt: IsoDateTime | null,
  ): Promise<void> {
    const res = await this.client
      .from(table)
      .update({ deleted_at: deletedAt })
      .eq('id', id)
      .select('id');
    const rows = unwrap(res, 'notFound');
    if (rows.length === 0) throw new AppError('notFound', id);
  }

  // ---- members ----

  async listMembers(): Promise<Member[]> {
    const res = await this.client.from('members').select(MEMBER_COLUMNS).order('sort_order');
    return unwrap<MemberRow[]>(res, 'notAllowed').map(toMember);
  }

  async createMember(input: MemberInput): Promise<Member> {
    const res = await this.client
      .from('members')
      .insert({ name: input.name, sort_order: input.sortOrder, color: input.color ?? null })
      .select(MEMBER_COLUMNS)
      .single();
    return toMember(unwrap<MemberRow>(res, 'invalidMemberName'));
  }

  async updateMember(id: Id, patch: Partial<MemberInput>): Promise<Member> {
    const row: Record<string, unknown> = {};
    if ('name' in patch) row.name = patch.name;
    if ('sortOrder' in patch) row.sort_order = patch.sortOrder;
    if ('color' in patch) row.color = patch.color ?? null;
    const res = await this.client
      .from('members')
      .update(row)
      .eq('id', id)
      .select(MEMBER_COLUMNS)
      .single();
    return toMember(unwrap<MemberRow>(res, 'invalidMemberName'));
  }

  async deleteMember(): Promise<void> {
    throw new AppError('unsupported', 'members are never deleted in shared mode');
  }

  // ---- meetups ----

  async listMeetups(): Promise<Meetup[]> {
    const res = await this.client.from('meetups').select(MEETUP_COLUMNS);
    return unwrap<MeetupRow[]>(res, 'notAllowed').map(toMeetup);
  }

  async createMeetup(input: MeetupInput): Promise<Meetup> {
    const res = await this.client
      .from('meetups')
      .insert({ title: input.title, date: input.date, note: noteValue(input.note) })
      .select(MEETUP_COLUMNS)
      .single();
    return toMeetup(unwrap<MeetupRow>(res, 'invalidMeetup'));
  }

  async updateMeetup(id: Id, patch: Partial<MeetupInput>): Promise<Meetup> {
    const row: Record<string, unknown> = {};
    if ('title' in patch) row.title = patch.title;
    if ('date' in patch) row.date = patch.date;
    if ('note' in patch) row.note = noteValue(patch.note);
    const res = await this.client
      .from('meetups')
      .update(row)
      .eq('id', id)
      .select(MEETUP_COLUMNS)
      .single();
    return toMeetup(unwrap<MeetupRow>(res, 'invalidMeetup'));
  }

  async softDeleteMeetup(id: Id, deletedAt: IsoDateTime = nowIso()): Promise<void> {
    await this.setDeletedAt('meetups', id, deletedAt);
  }

  async restoreMeetup(id: Id): Promise<void> {
    await this.setDeletedAt('meetups', id, null);
  }

  // ---- expenses (writes go through the save_expense RPC so shares change atomically) ----

  async listExpenses(): Promise<Expense[]> {
    const res = await this.client.from('expenses').select(EXPENSE_COLUMNS);
    return unwrap<ExpenseRow[]>(res, 'notAllowed').map(toExpense);
  }

  private async getExpense(id: Id): Promise<Expense> {
    const res = await this.client.from('expenses').select(EXPENSE_COLUMNS).eq('id', id).single();
    return toExpense(unwrap<ExpenseRow>(res, 'notFound'));
  }

  private async saveExpense(id: Id | undefined, input: ExpenseInput): Promise<Expense> {
    const p = {
      ...(id ? { id } : {}),
      meetup_id: input.meetupId,
      title: input.title,
      total_minor: input.totalMinor,
      paid_by_member_id: input.paidByMemberId,
      note: noteValue(input.note),
      shares: input.shares.map((s) => ({ member_id: s.memberId, amount_minor: s.amountMinor })),
    };
    const res = await this.client.rpc('save_expense', { p });
    const savedId = unwrap<string>(res, 'invalidExpense');
    return this.getExpense(savedId);
  }

  async createExpense(input: ExpenseInput): Promise<Expense> {
    return this.saveExpense(undefined, input);
  }

  async updateExpense(id: Id, patch: Partial<ExpenseInput>): Promise<Expense> {
    const current = await this.getExpense(id);
    return this.saveExpense(id, { ...current, ...patch });
  }

  async softDeleteExpense(id: Id, deletedAt: IsoDateTime = nowIso()): Promise<void> {
    await this.setDeletedAt('expenses', id, deletedAt);
  }

  async restoreExpense(id: Id): Promise<void> {
    await this.setDeletedAt('expenses', id, null);
  }

  // ---- settlements ----

  async listSettlements(): Promise<Settlement[]> {
    const res = await this.client.from('settlements').select(SETTLEMENT_COLUMNS);
    return unwrap<SettlementRow[]>(res, 'notAllowed').map(toSettlement);
  }

  async createSettlement(input: SettlementInput): Promise<Settlement> {
    const res = await this.client
      .from('settlements')
      .insert({
        from_member_id: input.fromMemberId,
        to_member_id: input.toMemberId,
        amount_minor: input.amountMinor,
        date: input.date,
        note: noteValue(input.note),
      })
      .select(SETTLEMENT_COLUMNS)
      .single();
    return toSettlement(unwrap<SettlementRow>(res, 'invalidSettlement'));
  }

  async updateSettlement(id: Id, patch: Partial<SettlementInput>): Promise<Settlement> {
    const row: Record<string, unknown> = {};
    if ('fromMemberId' in patch) row.from_member_id = patch.fromMemberId;
    if ('toMemberId' in patch) row.to_member_id = patch.toMemberId;
    if ('amountMinor' in patch) row.amount_minor = patch.amountMinor;
    if ('date' in patch) row.date = patch.date;
    if ('note' in patch) row.note = noteValue(patch.note);
    const res = await this.client
      .from('settlements')
      .update(row)
      .eq('id', id)
      .select(SETTLEMENT_COLUMNS)
      .single();
    return toSettlement(unwrap<SettlementRow>(res, 'invalidSettlement'));
  }

  async softDeleteSettlement(id: Id, deletedAt: IsoDateTime = nowIso()): Promise<void> {
    await this.setDeletedAt('settlements', id, deletedAt);
  }

  async restoreSettlement(id: Id): Promise<void> {
    await this.setDeletedAt('settlements', id, null);
  }

  // ---- whole dataset ----

  async exportSnapshot(): Promise<Snapshot> {
    const [members, meetups, expenses, settlements] = await Promise.all([
      this.listMembers(),
      this.listMeetups(),
      this.listExpenses(),
      this.listSettlements(),
    ]);
    return { schemaVersion: CURRENT_SCHEMA_VERSION, members, meetups, expenses, settlements };
  }

  async replaceAll(): Promise<void> {
    throw new AppError('unsupported', 'import is not available in shared mode');
  }

  async clearAll(): Promise<void> {
    throw new AppError('unsupported', 'nothing is hard-deleted in shared mode');
  }
}
