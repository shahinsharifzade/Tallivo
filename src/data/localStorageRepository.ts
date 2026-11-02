import type { Expense, Id, IsoDateTime, Meetup, Member, MemberCard, Settlement } from '../domain';
import { isCardNumberValid, isMemberReferenced, MAX_CARD_LABEL_LENGTH } from '../domain';
import { nowIso } from '../lib/dates';
import { newId } from '../lib/id';
import { AppError } from './errors';
import type {
  CardInput,
  ExpenseInput,
  MeetupInput,
  MemberInput,
  Repository,
  SettlementInput,
  Snapshot,
} from './repository';
import { emptySnapshot, parseStoredData } from './snapshot';

export const STORAGE_KEY = 'tallivo:v1';

type SoftDeletable = 'meetups' | 'expenses' | 'settlements';

/** What is stored: a snapshot plus the cards, which never leave this key (no export). */
type StoredData = Snapshot & { cards: MemberCard[] };

function emptyData(): StoredData {
  return { ...emptySnapshot(), cards: [] };
}

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

  private read(): StoredData {
    let raw: string | null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
    } catch (e) {
      console.error('[tallivo] Failed to read storage', e);
      return emptyData();
    }
    if (raw === null) return emptyData();

    let reason: string;
    try {
      const result = parseStoredData(JSON.parse(raw));
      if (result.ok) return { ...result.snapshot, cards: result.cards };
      reason = result.reason;
    } catch (e) {
      reason = e instanceof Error ? e.message : String(e);
    }
    this.quarantine(raw, reason);
    return emptyData();
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

  private write(snapshot: StoredData): void {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.error('[tallivo] Failed to write storage', e);
      throw new AppError('storageWrite', e instanceof Error ? e.message : undefined);
    }
  }

  private mutate<T>(fn: (snapshot: StoredData) => T): T {
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
      s.cards = s.cards.filter((c) => c.memberId !== id);
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

  async softDeleteMeetupWithExpenses(id: Id): Promise<void> {
    this.mutate((s) => {
      const meetup = LocalStorageRepository.find(s.meetups, id);
      if (meetup.deletedAt) return;
      const deletedAt = nowIso();
      meetup.deletedAt = deletedAt;
      for (const e of s.expenses) {
        if (e.meetupId === id && !e.deletedAt) e.deletedAt = deletedAt;
      }
    });
  }

  async restoreMeetupWithExpenses(id: Id): Promise<void> {
    this.mutate((s) => {
      const meetup = LocalStorageRepository.find(s.meetups, id);
      const deletedAt = meetup.deletedAt;
      if (!deletedAt) return;
      for (const e of s.expenses) {
        if (e.meetupId === id && e.deletedAt === deletedAt) e.deletedAt = undefined;
      }
      meetup.deletedAt = undefined;
    });
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

  // ---- cards ----

  async listCards(): Promise<MemberCard[]> {
    return this.read().cards;
  }

  async saveCard(input: CardInput, id?: Id): Promise<MemberCard> {
    const label = input.label?.trim() || undefined;
    if (
      !isCardNumberValid(input.cardNumber) ||
      (label !== undefined && label.length > MAX_CARD_LABEL_LENGTH)
    ) {
      throw new AppError('invalidCard');
    }
    return this.mutate((s) => {
      LocalStorageRepository.find(s.members, input.memberId);
      const duplicate = s.cards.some(
        (c) => c.id !== id && c.memberId === input.memberId && c.cardNumber === input.cardNumber,
      );
      if (duplicate) throw new AppError('cardDuplicate');
      const now = nowIso();
      if (id) {
        const fields = { ...input, label, updatedAt: now };
        return Object.assign(LocalStorageRepository.find(s.cards, id), fields);
      }
      const card: MemberCard = { id: newId(), ...input, label, createdAt: now, updatedAt: now };
      s.cards.push(card);
      return card;
    });
  }

  async deleteCard(id: Id): Promise<void> {
    this.mutate((s) => {
      LocalStorageRepository.find(s.cards, id);
      s.cards = s.cards.filter((c) => c.id !== id);
    });
  }

  // ---- whole dataset ----

  async exportSnapshot(): Promise<Snapshot> {
    // Built field by field so the stored cards cannot end up in the export.
    const { schemaVersion, members, meetups, expenses, settlements } = this.read();
    return { schemaVersion, members, meetups, expenses, settlements };
  }

  async replaceAll(snapshot: Snapshot): Promise<void> {
    // Backups have no cards, so restoring one keeps the cards of members that still exist.
    const memberIds = new Set(snapshot.members.map((m) => m.id));
    const cards = this.read().cards.filter((c) => memberIds.has(c.memberId));
    this.write({ ...snapshot, cards });
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
