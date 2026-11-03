import {
  applyTransfers,
  computeBalances,
  computeBalancesForMeetup,
  expenseMonthRange,
  expenseSettlements,
  formatMoney,
  monthlyExpenses,
  parseMoney,
  simplifyDebts,
  splitEqually,
  validateExpense,
  type Balances,
  type Transfer,
} from '../../domain';
import { az } from '../../i18n/az';
import {
  analyticsExpenses,
  analyticsMeetups,
  cycleExpenses,
  cycleSettlements,
  expenses,
  ids,
  members,
  settlementAshrafToShahin,
} from './referenceScenario';

export interface Check {
  label: string;
  computed: string;
  expected: string;
  ok: boolean;
}

export interface Section {
  title: string;
  checks: Check[];
}

const t = az.debug;
const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

function eq(label: string, computed: unknown, expected: unknown): Check {
  const c = JSON.stringify(computed);
  const e = JSON.stringify(expected);
  return { label, computed: c, expected: e, ok: c === e };
}

function balanceChecks(balances: Balances, expected: Record<string, number>): Check[] {
  const rows = members.map((m) =>
    eq(t.rows.balance(m.name), balances[m.id] ?? 0, expected[m.id] ?? 0),
  );
  const sum = Object.values(balances).reduce((a, b) => a + b, 0);
  rows.push(eq(t.rows.sumZero, sum, 0));
  return rows;
}

function describeTransfers(transfers: Transfer[]): string {
  return transfers
    .map((tr) => `${nameOf(tr.fromMemberId)} → ${nameOf(tr.toMemberId)} ${tr.amountMinor}`)
    .join('; ');
}

function transferChecks(balances: Balances): Check[] {
  const transfers = simplifyDebts(balances, members);
  const after = applyTransfers(balances, transfers);
  const allZero = Object.values(after).every((v) => v === 0);
  return [
    {
      label: t.rows.transfersList,
      computed: describeTransfers(transfers),
      expected: '—',
      ok: true,
    },
    {
      label: t.rows.transfersCount,
      computed: String(transfers.length),
      expected: '≤ 3',
      ok: transfers.length <= 3,
    },
    eq(t.rows.transfersSettle, allZero, true),
  ];
}

export function runChecks(): Section[] {
  const money: Check[] = [
    eq('parseMoney("12.5")', parseMoney('12.5'), { ok: true, minor: 1250 }),
    eq('parseMoney("12,50")', parseMoney('12,50'), { ok: true, minor: 1250 }),
    eq('parseMoney("-3")', parseMoney('-3'), { ok: false, error: 'negative' }),
    eq('parseMoney("0")', parseMoney('0'), { ok: false, error: 'zero' }),
    eq('parseMoney("1.234")', parseMoney('1.234'), { ok: false, error: 'tooManyDecimals' }),
    eq('formatMoney(1250)', formatMoney(1250), '12.50 ₼'),
    eq('formatMoney(-1766)', formatMoney(-1766), '-17.66 ₼'),
  ];

  const split: Check[] = [
    eq(
      'splitEqually(1000, [Əşrəf, Ayxan, Şahin])',
      splitEqually(1000, [ids.ashraf, ids.ayxan, ids.shahin]).map((s) => s.amountMinor),
      [334, 333, 333],
    ),
    eq(
      'splitEqually(2000, [Ayxan, Şahin, Əşrəf])',
      splitEqually(2000, [ids.ayxan, ids.shahin, ids.ashraf]).map((s) => s.amountMinor),
      [667, 667, 666],
    ),
  ];

  const validation: Check[] = [
    ...expenses.map((e) => eq(t.rows.expenseValid(e.title), validateExpense(e), [])),
    eq(
      'validateExpense(sum 2999 ≠ 3000)',
      validateExpense({
        totalMinor: 3000,
        paidByMemberId: ids.ayxan,
        shares: [
          { memberId: ids.ayxan, amountMinor: 1000 },
          { memberId: ids.shahin, amountMinor: 1999 },
        ],
      }),
      ['sharesSumMismatch'],
    ),
  ];

  const overallBalances = computeBalances(members, expenses, []);
  const overall: Check[] = [
    ...balanceChecks(overallBalances, {
      [ids.shahin]: 2633,
      [ids.ayxan]: 133,
      [ids.seyid]: -1000,
      [ids.ashraf]: -1766,
    }),
    ...transferChecks(overallBalances),
  ];

  const coffeeBalances = computeBalancesForMeetup(ids.coffee, members, expenses);
  const coffee: Check[] = [
    ...balanceChecks(coffeeBalances, {
      [ids.shahin]: 2300,
      [ids.ayxan]: -1200,
      [ids.ashraf]: -1100,
      [ids.seyid]: 0,
    }),
    eq(t.rows.transfersList, simplifyDebts(coffeeBalances, members), [
      { fromMemberId: ids.ayxan, toMemberId: ids.shahin, amountMinor: 1200 },
      { fromMemberId: ids.ashraf, toMemberId: ids.shahin, amountMinor: 1100 },
    ]),
  ];

  const afterBalances = computeBalances(members, expenses, [settlementAshrafToShahin]);
  const settlement: Check[] = [
    ...balanceChecks(afterBalances, {
      [ids.shahin]: 1633,
      [ids.ayxan]: 133,
      [ids.seyid]: -1000,
      [ids.ashraf]: -766,
    }),
    ...transferChecks(afterBalances),
  ];

  // Settlement cycles: replay the timeline up to a point and look at each expense's batch.
  const statusAt = (until: string) => {
    const upTo = <T extends { createdAt: string }>(rows: T[]) =>
      rows.filter((r) => r.createdAt <= until);
    const map = expenseSettlements(members, upTo(cycleExpenses), upTo(cycleSettlements));
    return Object.fromEntries(['e1', 'e2', 'e3'].map((id) => [id, map.get(id)?.batchId ?? 'open']));
  };
  const finalSettled = expenseSettlements(members, cycleExpenses, cycleSettlements);
  const finalBalances = computeBalances(members, cycleExpenses, cycleSettlements);
  const cycles: Check[] = [
    eq('after e1, e2 (no repayments)', statusAt('2026-01-03T23:00:00.000Z'), {
      e1: 'open',
      e2: 'open',
      e3: 'open',
    }),
    eq('after partial repayments s1..s3', statusAt('2026-01-05T23:00:00.000Z'), {
      e1: 'open',
      e2: 'open',
      e3: 'open',
    }),
    eq('s4 brings balances to zero', statusAt('2026-01-06T23:00:00.000Z'), {
      e1: 's4',
      e2: 's4',
      e3: 'open',
    }),
    eq('new expense e3 after the settlement', statusAt('2026-01-07T23:00:00.000Z'), {
      e1: 's4',
      e2: 's4',
      e3: 'open',
    }),
    eq('s5 settles the second batch only', statusAt('2026-01-31T00:00:00.000Z'), {
      e1: 's4',
      e2: 's4',
      e3: 's5',
    }),
    eq('settledAt of batch 1', finalSettled.get('e1')?.settledAt, '2026-01-06T10:00:00.000Z'),
    eq(
      'deleted expenses are never in a batch',
      [finalSettled.has('e4'), finalSettled.has('e5')],
      [false, false],
    ),
    eq(
      'all zero ⇔ every active expense settled',
      Object.values(finalBalances).every((v) => v === 0),
      cycleExpenses.filter((e) => !e.deletedAt).every((e) => finalSettled.has(e.id)),
    ),
  ];

  const month = monthlyExpenses('2026-01', members, analyticsExpenses, analyticsMeetups);
  const february = monthlyExpenses('2026-02', members, analyticsExpenses, analyticsMeetups);
  const shareSum = Object.values(month.byMember).reduce((a, b) => a + b, 0);
  const daySum = month.days.reduce((a, d) => a + d.totalMinor, 0);
  const bars = (m: typeof month) =>
    m.days
      .filter((d) => d.totalMinor > 0)
      .map((d) => [d.date, d.totalMinor, d.meetups.map((x) => `${x.title} ${x.totalMinor}`)]);
  const analytics: Check[] = [
    eq('January total (no repayments, no deleted)', month.totalMinor, 18680),
    eq('expense count', month.expenseCount, 7),
    eq('one bar per day; meetups combined; same title on another day stays apart', bars(month), [
      ['2026-01-01', 10000, ['Garden 10000']],
      ['2026-01-02', 2000, ['PlayStation 2000']],
      ['2026-01-03', 5180, ['Coffee 3000', 'Dinner 2180']],
      ['2026-01-20', 1500, ['Garden 1500']],
    ]),
    eq('shares, not payments', month.byMember, {
      [ids.ashraf]: 2500,
      [ids.ayxan]: 4500,
      [ids.shahin]: 7500,
      [ids.seyid]: 4180,
    }),
    eq(
      'Σ member shares = Σ bars = total',
      [shareSum, daySum],
      [month.totalMinor, month.totalMinor],
    ),
    eq('31 days in January', month.days.length, 31),
    eq('February: by meetup date, not recording date', bars(february), [
      ['2026-02-10', 4000, ['February 4000']],
    ]),
    eq(
      'month range ignores the deleted meetup',
      expenseMonthRange(analyticsExpenses, analyticsMeetups),
      { first: '2026-01', last: '2026-02' },
    ),
    eq(
      'empty month',
      monthlyExpenses('2026-04', members, analyticsExpenses, analyticsMeetups).totalMinor,
      0,
    ),
  ];

  return [
    { title: t.sections.money, checks: money },
    { title: t.sections.split, checks: split },
    { title: t.sections.validation, checks: validation },
    { title: t.sections.overall, checks: overall },
    { title: t.sections.coffee, checks: coffee },
    { title: t.sections.settlement, checks: settlement },
    { title: t.sections.cycles, checks: cycles },
    { title: t.sections.analytics, checks: analytics },
  ];
}
