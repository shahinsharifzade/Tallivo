// Validation and migration of untrusted snapshot data (imported files, stored payloads).
import {
  isIsoDate,
  validateExpense,
  validateSettlement,
  type Expense,
  type ExpenseShare,
  type Meetup,
  type Member,
  type Settlement,
} from '../domain';
import { CURRENT_SCHEMA_VERSION, type Snapshot } from './repository';

export type SnapshotParseResult = { ok: true; snapshot: Snapshot } | { ok: false; reason: string };

export function emptySnapshot(): Snapshot {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    members: [],
    meetups: [],
    expenses: [],
    settlements: [],
  };
}

class InvalidSnapshot extends Error {}

function fail(reason: string): never {
  throw new InvalidSnapshot(reason);
}

type Obj = Record<string, unknown>;

function obj(value: unknown, where: string): Obj {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${where}: expected object`);
  }
  return value as Obj;
}

function arr(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) fail(`${where}: expected array`);
  return value;
}

function str(o: Obj, key: string, where: string): string {
  const v = o[key];
  if (typeof v !== 'string' || v === '') fail(`${where}.${key}: expected non-empty string`);
  return v;
}

function optStr(o: Obj, key: string, where: string): string | undefined {
  const v = o[key];
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string') fail(`${where}.${key}: expected string`);
  return v;
}

function int(o: Obj, key: string, where: string): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isSafeInteger(v)) fail(`${where}.${key}: expected integer`);
  return v;
}

function date(o: Obj, key: string, where: string): string {
  const v = str(o, key, where);
  if (!isIsoDate(v)) fail(`${where}.${key}: expected YYYY-MM-DD`);
  return v;
}

/** Migrates older payloads to the current schema. Only v1 exists so far. */
function migrate(root: Obj): Obj {
  const version = root.schemaVersion;
  if (version === CURRENT_SCHEMA_VERSION) return root;
  return fail(`unsupported schemaVersion ${String(version)}`);
}

function parseMember(value: unknown, i: number): Member {
  const w = `members[${i}]`;
  const o = obj(value, w);
  return {
    id: str(o, 'id', w),
    name: str(o, 'name', w),
    sortOrder: int(o, 'sortOrder', w),
    createdAt: str(o, 'createdAt', w),
  };
}

function parseMeetup(value: unknown, i: number): Meetup {
  const w = `meetups[${i}]`;
  const o = obj(value, w);
  return {
    id: str(o, 'id', w),
    title: str(o, 'title', w),
    date: date(o, 'date', w),
    note: optStr(o, 'note', w),
    createdAt: str(o, 'createdAt', w),
    deletedAt: optStr(o, 'deletedAt', w),
  };
}

function parseExpense(value: unknown, i: number): Expense {
  const w = `expenses[${i}]`;
  const o = obj(value, w);
  const shares: ExpenseShare[] = arr(o.shares, `${w}.shares`).map((s, j) => {
    const so = obj(s, `${w}.shares[${j}]`);
    return {
      memberId: str(so, 'memberId', `${w}.shares[${j}]`),
      amountMinor: int(so, 'amountMinor', `${w}.shares[${j}]`),
    };
  });
  const expense: Expense = {
    id: str(o, 'id', w),
    meetupId: str(o, 'meetupId', w),
    title: str(o, 'title', w),
    totalMinor: int(o, 'totalMinor', w),
    paidByMemberId: str(o, 'paidByMemberId', w),
    shares,
    note: optStr(o, 'note', w),
    createdAt: str(o, 'createdAt', w),
    updatedAt: str(o, 'updatedAt', w),
    deletedAt: optStr(o, 'deletedAt', w),
  };
  const errors = validateExpense(expense);
  if (errors.length > 0) fail(`${w}: ${errors.join(', ')}`);
  return expense;
}

function parseSettlement(value: unknown, i: number): Settlement {
  const w = `settlements[${i}]`;
  const o = obj(value, w);
  const settlement: Settlement = {
    id: str(o, 'id', w),
    fromMemberId: str(o, 'fromMemberId', w),
    toMemberId: str(o, 'toMemberId', w),
    amountMinor: int(o, 'amountMinor', w),
    date: date(o, 'date', w),
    note: optStr(o, 'note', w),
    createdAt: str(o, 'createdAt', w),
    deletedAt: optStr(o, 'deletedAt', w),
  };
  const errors = validateSettlement(settlement);
  if (errors.length > 0) fail(`${w}: ${errors.join(', ')}`);
  return settlement;
}

function assertUniqueIds(items: { id: string }[], where: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) fail(`${where}: duplicate id ${item.id}`);
    seen.add(item.id);
  }
}

/**
 * Validates an untrusted value as a Snapshot: shape, types, money invariants, unique ids and
 * references between entities. Unknown fields are dropped.
 */
export function parseSnapshot(value: unknown): SnapshotParseResult {
  try {
    const root = migrate(obj(value, 'root'));
    const snapshot: Snapshot = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      members: arr(root.members, 'members').map(parseMember),
      meetups: arr(root.meetups, 'meetups').map(parseMeetup),
      expenses: arr(root.expenses, 'expenses').map(parseExpense),
      settlements: arr(root.settlements, 'settlements').map(parseSettlement),
    };

    assertUniqueIds(snapshot.members, 'members');
    assertUniqueIds(snapshot.meetups, 'meetups');
    assertUniqueIds(snapshot.expenses, 'expenses');
    assertUniqueIds(snapshot.settlements, 'settlements');

    const memberIds = new Set(snapshot.members.map((m) => m.id));
    const meetupIds = new Set(snapshot.meetups.map((m) => m.id));
    const checkMember = (id: string, where: string) => {
      if (!memberIds.has(id)) fail(`${where}: unknown member ${id}`);
    };
    snapshot.expenses.forEach((e, i) => {
      if (!meetupIds.has(e.meetupId)) fail(`expenses[${i}]: unknown meetup ${e.meetupId}`);
      checkMember(e.paidByMemberId, `expenses[${i}]`);
      e.shares.forEach((s) => checkMember(s.memberId, `expenses[${i}]`));
    });
    snapshot.settlements.forEach((s, i) => {
      checkMember(s.fromMemberId, `settlements[${i}]`);
      checkMember(s.toMemberId, `settlements[${i}]`);
    });

    return { ok: true, snapshot };
  } catch (e) {
    if (e instanceof InvalidSnapshot) return { ok: false, reason: e.message };
    throw e;
  }
}

/** Parses JSON text (e.g. an imported backup file) into a validated Snapshot. */
export function parseSnapshotJson(text: string): SnapshotParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'not valid JSON' };
  }
  return parseSnapshot(value);
}

export function serializeSnapshot(snapshot: Snapshot): string {
  return JSON.stringify(snapshot, null, 2);
}
