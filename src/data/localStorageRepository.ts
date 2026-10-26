import type { Expense, Id, IsoDateTime, Meetup, Member, Settlement } from '../domain';
import { isMemberReferenced } from '../domain';
import { nowIso } from '../lib/dates';
import { newId } from '../lib/id';
import { AppError } from './errors';
import type {
  ExpenseInput,
  MeetupInput,
  MemberInput,
  Repository,
  SettlementInput,
  Snapshot,
} from './repository';
import { emptySnapshot, parseSnapshot } from './snapshot';

export const STORAGE_KEY = 'tallivo:v1';

type SoftDeletable = 'meetups' | 'expenses' | 'settlements';

/** Minimal in-memory Storage used when localStorage is unavailable (e.g. blocked by the browser). */
function memoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function defaultStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  try {
    const storage = window.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch (e) {
    console.error('[tallivo] localStorage unavailable; data will not survive a reload', e);
    return memoryStorage();
  }
}

/**
 * Repository backed by a single versioned localStorage key. Every operation re-reads storage,
 * so several open tabs do not overwrite each other with stale copies.
 */
export class LocalStorageRepository implements Repository {
  private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

  constructor(storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {
    this.storage = storage ?? defaultStorage();
  }

  // ---- storage plumbing ----

  private read(): Snapshot {
    let raw: string | null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch (e) {
      console.error('[tallivo] Failed to read storage', e);
      return emptySnapshot();
    }
    if (raw === null) return emptySnapshot();

    let reason: string;
    try {
      const result = parseSnapshot(JSON.parse(raw));
      if (result.ok) return result.snapshot;
      reason = result.reason;
    } catch (e) {
      reason = e instanceof Error ? e.message : String(e);
    }
    this.quarantine(raw, reason);
    return emptySnapshot();
  }

  /** Keeps a copy of unreadable data under a separate key, then starts fresh. */
  private quarantine(raw: string, reason: string): void {
    const backupKey = `${STORAGE_KEY}:corrupt:${Date.now()}`;
    try {
      this.storage.setItem(backupKey, raw);
      this.storage.removeItem(STORAGE_KEY);
      console.error(
        `[tallivo] Stored data was unreadable (${reason}). Copy saved as "${backupKey}".`,
      );
    } catch (e) {
      console.error(
        `[tallivo] Stored data was unreadable (${reason}) and could not be backed up`,
        e,
      );
    }
  }

  private write(snapshot: Snapshot): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.error('[tallivo] Failed to write storage', e);
      throw new AppError('storageWrite', e instanceof Error ? e.message : undefined);
    }
  }

  private mutate<T>(fn: (snapshot: Snapshot) => T): T {
    const snapshot = this.read();
    const result = fn(snapshot);
    this.write(snapshot);
    return result;
  }

  private static find<T extends { id: Id }>(items: T[], id: Id): T {
    const item = items.find((i) => i.id === id);
    if (!item) throw new AppError('notFound', id);
    return item;
  }

  private setDeletedAt(key: SoftDeletable, id: Id, deletedAt: IsoDateTime | undefined): void {
    this.mutate((s) => {
      const item = LocalStorageRepository.find<{ id: Id; deletedAt?: string }>(s[key], id);
      item.deletedAt = deletedAt;
    });
  }

  // ---- members ----

  async listMembers(): Promise<Member[]> {
    return this.read().members;
  }

  async createMember(input: MemberInput): Promise<Member> {
    return this.mutate((s) => {
      const member: Member = { id: newId(), ...input, createdAt: nowIso() };
      s.members.push(member);
      return member;
    });
  }

  async updateMember(id: Id, patch: Partial<MemberInput>): Promise<Member> {
    return this.mutate((s) => Object.assign(LocalStorageRepository.find(s.members, id), patch));
  }

  async deleteMember(id: Id): Promise<void> {
    this.mutate((s) => {
      LocalStorageRepository.find(s.members, id);
      if (isMemberReferenced(id, s.expenses, s.settlements)) throw new AppError('memberInUse');
      s.members = s.members.filter((m) => m.id !== id);
    });
  }

  // ---- meetups ----

  async listMeetups(): Promise<Meetup[]> {
    return this.read().meetups;
  }

  async createMeetup(input: MeetupInput): Promise<Meetup> {
    return this.mutate((s) => {
      const meetup: Meetup = { id: newId(), ...input, createdAt: nowIso() };
      s.meetups.push(meetup);
      return meetup;
    });
  }

  async updateMeetup(id: Id, patch: Partial<MeetupInput>): Promise<Meetup> {
    return this.mutate((s) => Object.assign(LocalStorageRepository.find(s.meetups, id), patch));
  }

  async softDeleteMeetup(id: Id, deletedAt: IsoDateTime = nowIso()): Promise<void> {
    this.setDeletedAt('meetups', id, deletedAt);
  }

  async restoreMeetup(id: Id): Promise<void> {
    this.setDeletedAt('meetups', id, undefined);
  }

  // ---- expenses ----

  async listExpenses(): Promise<Expense[]> {
    return this.read().expenses;
  }

  async createExpense(input: ExpenseInput): Promise<Expense> {
    return this.mutate((s) => {
      const now = nowIso();
      const expense: Expense = { id: newId(), ...input, createdAt: now, updatedAt: now };
      s.expenses.push(expense);
      return expense;
    });
  }

  async updateExpense(id: Id, patch: Partial<ExpenseInput>): Promise<Expense> {
    return this.mutate((s) =>
      Object.assign(LocalStorageRepository.find(s.expenses, id), patch, { updatedAt: nowIso() }),
    );
  }

  async softDeleteExpense(id: Id, deletedAt: IsoDateTime = nowIso()): Promise<void> {
    this.setDeletedAt('expenses', id, deletedAt);
  }

  async restoreExpense(id: Id): Promise<void> {
    this.setDeletedAt('expenses', id, undefined);
  }

  // ---- settlements ----

  async listSettlements(): Promise<Settlement[]> {
    return this.read().settlements;
  }

  async createSettlement(input: SettlementInput): Promise<Settlement> {
    return this.mutate((s) => {
      const settlement: Settlement = { id: newId(), ...input, createdAt: nowIso() };
      s.settlements.push(settlement);
      return settlement;
    });
  }

  async updateSettlement(id: Id, patch: Partial<SettlementInput>): Promise<Settlement> {
    return this.mutate((s) => Object.assign(LocalStorageRepository.find(s.settlements, id), patch));
  }

  async softDeleteSettlement(id: Id, deletedAt: IsoDateTime = nowIso()): Promise<void> {
    this.setDeletedAt('settlements', id, deletedAt);
  }

  async restoreSettlement(id: Id): Promise<void> {
    this.setDeletedAt('settlements', id, undefined);
  }

  // ---- whole dataset ----

  async exportSnapshot(): Promise<Snapshot> {
    return this.read();
  }

  async replaceAll(snapshot: Snapshot): Promise<void> {
    this.write(snapshot);
  }

  async clearAll(): Promise<void> {
    try {
      this.storage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[tallivo] Failed to clear storage', e);
      throw new AppError('storageWrite', e instanceof Error ? e.message : undefined);
    }
  }
}
