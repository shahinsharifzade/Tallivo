// Domain model. These shapes mirror the future database tables 1:1.

export type Id = string;

/** ISO 8601 timestamp, e.g. "2026-10-27T18:30:00.000Z". */
export type IsoDateTime = string;

/** Calendar date, "YYYY-MM-DD". */
export type IsoDate = string;

/** Money in integer minor units (qəpik). 1 AZN = 100. */
export type Minor = number;

export interface Member {
  id: Id;
  name: string;
  sortOrder: number;
  /** Display color ("#rrggbb"). Optional: older data has none and gets a default by sortOrder. */
  color?: string;
  createdAt: IsoDateTime;
}

export interface Meetup {
  id: Id;
  title: string;
  date: IsoDate;
  note?: string;
  createdAt: IsoDateTime;
  deletedAt?: IsoDateTime;
}

export interface ExpenseShare {
  memberId: Id;
  amountMinor: Minor;
}

export interface Expense {
  id: Id;
  meetupId: Id;
  title: string;
  totalMinor: Minor;
  paidByMemberId: Id;
  /** Must sum exactly to totalMinor. Members not listed did not participate. */
  shares: ExpenseShare[];
  note?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  deletedAt?: IsoDateTime;
}

export interface Settlement {
  id: Id;
  /** The person paying back. */
  fromMemberId: Id;
  /** The person receiving the money. */
  toMemberId: Id;
  amountMinor: Minor;
  date: IsoDate;
  note?: string;
  createdAt: IsoDateTime;
  deletedAt?: IsoDateTime;
}

/**
 * memberId -> balance in minor units.
 * Positive: the group owes this person. Negative: this person owes the group.
 */
export type Balances = Record<Id, Minor>;

export interface Transfer {
  fromMemberId: Id;
  toMemberId: Id;
  amountMinor: Minor;
}
