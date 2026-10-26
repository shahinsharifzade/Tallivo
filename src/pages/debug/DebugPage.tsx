import { useMemo } from 'react';
import { az } from '../../i18n/az';
import { runChecks } from './checks';

const t = az.debug;

export default function DebugPage() {
  const sections = useMemo(runChecks, []);
  const failed = sections.flatMap((s) => s.checks).filter((c) => !c.ok).length;

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-xl font-bold">{t.title}</h1>
      <p className="text-sm text-ink-soft">{t.subtitle}</p>
      <p
        className={`mt-3 rounded-lg px-3 py-2 font-semibold ${
          failed === 0 ? 'bg-pos-soft text-pos' : 'bg-neg-soft text-neg'
        }`}
        data-testid="debug-summary"
      >
        {failed === 0 ? t.summaryAllOk : t.summaryFailed(failed)}
      </p>

      {sections.map((section) => (
        <section key={section.title} className="mt-6">
          <h2 className="mb-2 font-semibold">{section.title}</h2>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-left text-sm tabular">
              <thead className="bg-surface-2 text-ink-soft">
                <tr>
                  <th className="px-3 py-2">{t.check}</th>
                  <th className="px-3 py-2">{t.computed}</th>
                  <th className="px-3 py-2">{t.expected}</th>
                  <th className="px-3 py-2">{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {section.checks.map((c, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    <td className="px-3 py-2">{c.label}</td>
                    <td className="break-all px-3 py-2 font-mono text-xs">{c.computed}</td>
                    <td className="break-all px-3 py-2 font-mono text-xs">{c.expected}</td>
                    <td className={`px-3 py-2 font-bold ${c.ok ? 'text-pos' : 'text-neg'}`}>
                      {c.ok ? t.ok : t.mismatch}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </main>
  );
}
