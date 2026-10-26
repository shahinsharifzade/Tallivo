import {
  applyTransfers,
  computeBalances,
  computeBalancesForMeetup,
  formatMoney,
  parseMoney,
  simplifyDebts,
  splitEqually,
  validateExpense,
  type Balances,
  type Transfer,
} from '../../domain';
import { az } from '../../i18n/az';
import { expenses, ids, members, settlementAshrafToShahin } from './referenceScenario';

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

  return [
    { title: t.sections.money, checks: money },
    { title: t.sections.split, checks: split },
    { title: t.sections.validation, checks: validation },
    { title: t.sections.overall, checks: overall },
    { title: t.sections.coffee, checks: coffee },
    { title: t.sections.settlement, checks: settlement },
  ];
}
