// Use cases on top of the Repository. Keeps cross-entity rules (cascading soft deletes,
// validation before writes) out of both components and the storage implementation.
import {
  isIsoDate,
  isMemberReferenced,
  validateExpense,
  validateMemberName,
  validateSettlement,
  type Expense,
  type Id,
  type Meetup,
  type Member,
  type Settlement,
} from '../domain';
import { AppError } from '../data/errors';
import type { ExpenseInput, MeetupInput, Repository, SettlementInput } from '../data/repository';
import { seedDefaultMembers } from '../data/seed';
import { parseSnapshotJson, serializeSnapshot } from '../data/snapshot';

export interface ImportSummary {
  members: number;
  meetups: number;
  expenses: number;
  settlements: number;
}

export interface AppActions {
  addMember(name: string): Promise<Member>;
  renameMember(id: Id, name: string): Promise<void>;
  setMemberColor(id: Id, color: string): Promise<void>;
  deleteMember(id: Id): Promise<void>;

  createMeetup(input: MeetupInput): Promise<Meetup>;
  updateMeetup(id: Id, input: MeetupInput): Promise<void>;
  deleteMeetup(id: Id): Promise<void>;
  restoreMeetup(id: Id): Promise<void>;

  createExpense(input: ExpenseInput): Promise<Expense>;
  updateExpense(id: Id, input: ExpenseInput): Promise<void>;
  deleteExpense(id: Id): Promise<void>;
  restoreExpense(id: Id): Promise<void>;

  createSettlement(input: SettlementInput): Promise<Settlement>;
  deleteSettlement(id: Id): Promise<void>;
  restoreSettlement(id: Id): Promise<void>;

  exportJson(): Promise<string>;
  importJson(text: string): Promise<ImportSummary>;
  resetAll(): Promise<void>;
}

function cleanNote(note: string | undefined): string | undefined {
  const trimmed = note?.trim();
  return trimmed ? trimmed : undefined;
}

/** Builds the action set. `reload` refreshes the in-memory state after every write. */
export function createActions(repository: Repository, reload: () => Promise<void>): AppActions {
  const after = async <T>(work: Promise<T>): Promise<T> => {
    try {
      return await work;
    } finally {
      await reload();
    }
  };

  const normalizeMeetup = (input: MeetupInput): MeetupInput => {
    const title = input.title.trim();
    if (!title || !isIsoDate(input.date)) throw new AppError('invalidMeetup');
    return { title, date: input.date, note: cleanNote(input.note) };
  };

  const normalizeExpense = async (input: ExpenseInput): Promise<ExpenseInput> => {
    const title = input.title.trim();
    if (!title || validateExpense(input).length > 0) throw new AppError('invalidExpense');
    const [members, meetups] = await Promise.all([
      repository.listMembers(),
      repository.listMeetups(),
    ]);
    const memberIds = new Set(members.map((m) => m.id));
    const memberIdsOk =
      memberIds.has(input.paidByMemberId) && input.shares.every((s) => memberIds.has(s.memberId));
    if (!memberIdsOk) throw new AppError('invalidExpense', 'unknown member');
    const meetup = meetups.find((m) => m.id === input.meetupId);
    if (!meetup) throw new AppError('notFound', input.meetupId);
    if (meetup.deletedAt) throw new AppError('meetupDeleted');
    return {
      meetupId: input.meetupId,
      title,
      totalMinor: input.totalMinor,
      paidByMemberId: input.paidByMemberId,
      shares: input.shares.map((s) => ({ memberId: s.memberId, amountMinor: s.amountMinor })),
      note: cleanNote(input.note),
    };
  };

  return {
    async addMember(name) {
      const members = await repository.listMembers();
      if (validateMemberName(name, members)) throw new AppError('invalidMemberName');
      const sortOrder = members.reduce((max, m) => Math.max(max, m.sortOrder), -1) + 1;
      return after(repository.createMember({ name: name.trim(), sortOrder }));
    },

    async renameMember(id, name) {
      const members = await repository.listMembers();
      if (validateMemberName(name, members, id)) throw new AppError('invalidMemberName');
      await after(repository.updateMember(id, { name: name.trim() }));
    },

    async setMemberColor(id, color) {
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new AppError('invalidMemberName', 'bad color');
      await after(repository.updateMember(id, { color }));
    },

    async deleteMember(id) {
      const [expenses, settlements] = await Promise.all([
        repository.listExpenses(),
        repository.listSettlements(),
      ]);
      if (isMemberReferenced(id, expenses, settlements)) throw new AppError('memberInUse');
      await after(repository.deleteMember(id));
    },

    async createMeetup(input) {
      return after(repository.createMeetup(normalizeMeetup(input)));
    },

    async updateMeetup(id, input) {
      await after(repository.updateMeetup(id, normalizeMeetup(input)));
    },

    // Deleting a meetup also soft-deletes its active expenses with the same timestamp, in one
    // atomic repository call, so restoring the meetup brings back exactly those expenses.
    async deleteMeetup(id) {
      await after(repository.softDeleteMeetupWithExpenses(id));
    },

    async restoreMeetup(id) {
      await after(repository.restoreMeetupWithExpenses(id));
    },

    async createExpense(input) {
      const clean = await normalizeExpense(input);
      return after(repository.createExpense(clean));
    },

    async updateExpense(id, input) {
      const clean = await normalizeExpense(input);
      await after(repository.updateExpense(id, clean));
    },

    async deleteExpense(id) {
      await after(repository.softDeleteExpense(id));
    },

    // Restoring an expense of a deleted meetup also restores that meetup (but not its siblings).
    async restoreExpense(id) {
      const [meetups, expenses] = await Promise.all([
        repository.listMeetups(),
        repository.listExpenses(),
      ]);
      const expense = expenses.find((e) => e.id === id);
      if (!expense) throw new AppError('notFound', id);
      const meetup = meetups.find((m) => m.id === expense.meetupId);
      await after(
        (async () => {
          await repository.restoreExpense(id);
          if (meetup?.deletedAt) await repository.restoreMeetup(meetup.id);
        })(),
      );
    },

    async createSettlement(input) {
      if (validateSettlement(input).length > 0 || !isIsoDate(input.date)) {
        throw new AppError('invalidSettlement');
      }
      const members = await repository.listMembers();
      const ids = new Set(members.map((m) => m.id));
      if (!ids.has(input.fromMemberId) || !ids.has(input.toMemberId)) {
        throw new AppError('invalidSettlement', 'unknown member');
      }
      return after(repository.createSettlement({ ...input, note: cleanNote(input.note) }));
    },

    async deleteSettlement(id) {
      await after(repository.softDeleteSettlement(id));
    },

    async restoreSettlement(id) {
      await after(repository.restoreSettlement(id));
    },

    async exportJson() {
      return serializeSnapshot(await repository.exportSnapshot());
    },

    async importJson(text) {
      const result = parseSnapshotJson(text);
      if (!result.ok) {
        console.error('[tallivo] Import rejected:', result.reason);
        throw new AppError('importInvalid', result.reason);
      }
      const { snapshot } = result;
      await after(repository.replaceAll(snapshot));
      return {
        members: snapshot.members.length,
        meetups: snapshot.meetups.length,
        expenses: snapshot.expenses.length,
        settlements: snapshot.settlements.length,
      };
    },

    async resetAll() {
      await after(
        (async () => {
          await repository.clearAll();
          await seedDefaultMembers(repository);
        })(),
      );
    },
  };
}
