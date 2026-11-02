import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { BalanceLabel } from '../components/BalanceBars';
import { CardForm } from '../components/CardForm';
import { ChangePasswordCard } from '../components/ChangePasswordCard';
import { ColorSwatches } from '../components/ColorSwatches';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CardsArt } from '../components/illustrations';
import { EyeIcon, EyeOffIcon, PencilIcon, PlusIcon, TrashIcon } from '../components/icons';
import { MemberChips } from '../components/MemberChips';
import { PaymentCard } from '../components/PaymentCard';
import { buttonClass } from '../components/styles';
import { TransferCards } from '../components/TransferCards';
import { Badge, Card, EmptyState, ErrorText, PageHeader, SectionTitle } from '../components/ui';
import { formatMoney, maskCardNumber, type Id, type Member, type MemberCard } from '../domain';
import { az } from '../i18n/az';
import { memberColor } from '../lib/memberColors';
import { useCountUp } from '../lib/motion';
import { paymentLink } from '../lib/paymentLink';
import { useAccount, useBackend } from '../state/backend';
import {
  useActions,
  useAppData,
  useConsumedByMember,
  useCurrentMember,
  useOverallSummary,
  usePaidByMember,
} from '../state/hooks';
import { useSubmit } from '../state/useSubmit';

const t = az.profile;

/** The signed-in member's own page. Local mode has no login, so a selector picks the member. */
export function ProfilePage() {
  const { members } = useAppData();
  const { memberId: signedInId } = useCurrentMember();
  const local = useBackend().mode === 'local';
  const [selectedId, setSelectedId] = useState<Id | null>(null);

  const memberId = local ? (selectedId ?? members[0]?.id) : signedInId;
  const member = members.find((m) => m.id === memberId);

  return (
    <div className="space-y-4">
      <PageHeader title={t.title} />
      {local && members.length > 0 && (
        <Card>
          <SectionTitle hint={t.localHint}>{t.localSelector}</SectionTitle>
          <MemberChips
            members={members}
            selected={new Set(member ? [member.id] : [])}
            onToggle={setSelectedId}
          />
        </Card>
      )}
      {/* Keyed so that revealed card numbers and open forms never carry over to another member. */}
      {member ? (
        <MemberProfile key={member.id} member={member} />
      ) : (
        <EmptyState title={t.noMember} />
      )}
      <AccountSection />
    </div>
  );
}

function MemberProfile({ member }: { member: Member }) {
  const account = useAccount();
  const { isAdmin } = useCurrentMember();
  const shared = useBackend().mode === 'supabase';
  return (
    <>
      <Card className="flex flex-col items-center text-center">
        <Avatar member={member} size="xl" />
        <h2 className="mt-3 break-words text-xl font-bold">{member.name}</h2>
        {shared && isAdmin && (
          <div className="mt-1">
            <Badge>{t.adminBadge}</Badge>
          </div>
        )}
        {account && <p className="mt-1 break-all text-sm text-ink-muted">{account.email}</p>}
      </Card>
      <Summary member={member} />
      <CardsSection member={member} />
      <ColorSection member={member} />
    </>
  );
}

function Summary({ member }: { member: Member }) {
  const { members } = useAppData();
  const { balances, transfers } = useOverallSummary();
  const paid = usePaidByMember();
  const consumed = useConsumedByMember();
  const mine = transfers.filter((x) => x.fromMemberId === member.id || x.toMemberId === member.id);
  return (
    <>
      <Card>
        <p className="text-sm text-ink-muted">{t.balance}</p>
        <p className="mt-1 text-xl">
          <BalanceLabel value={balances[member.id] ?? 0} />
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
          <Stat label={t.totalPaid} value={paid[member.id] ?? 0} />
          <Stat label={t.totalConsumed} value={consumed[member.id] ?? 0} />
        </div>
      </Card>
      <Card>
        <SectionTitle hint={mine.length > 0 ? az.overview.transfersHint : undefined}>
          {t.debtsTitle}
        </SectionTitle>
        <TransferCards
          transfers={mine}
          members={members}
          emptyText={t.noDebts}
          linkFor={paymentLink}
        />
      </Card>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const shown = useCountUp(value);
  return (
    <div className="min-w-0">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="tabular mt-0.5 text-lg font-bold">{formatMoney(shown)}</p>
    </div>
  );
}

function CardsSection({ member }: { member: Member }) {
  const { cards, cardsReady } = useAppData();
  const actions = useActions();
  const { error, run } = useSubmit();
  const mine = cards.filter((c) => c.memberId === member.id);
  // 'new', the id of the card being edited, or null.
  const [editing, setEditing] = useState<'new' | Id | null>(null);
  const [revealed, setRevealed] = useState<ReadonlySet<Id>>(new Set());
  const [toDelete, setToDelete] = useState<MemberCard | null>(null);

  const toggleReveal = (id: Id) =>
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const remove = async () => {
    const card = toDelete;
    setToDelete(null);
    if (card) await run(() => actions.deleteCard(card.id));
  };

  return (
    <Card>
      <SectionTitle hint={cardsReady ? t.cardsHint : undefined}>{t.cardsTitle}</SectionTitle>
      {!cardsReady ? (
        <p className="text-sm text-ink-muted">{az.errors.serverOutdated}</p>
      ) : (
        <div className="space-y-4">
          {mine.length === 0 && editing !== 'new' && (
            <EmptyState art={<CardsArt />} title={t.noCards} />
          )}
          {mine.length > 0 && (
            <ul className="stagger space-y-4">
              {mine.map((card) => {
                const isRevealed = revealed.has(card.id);
                return (
                  <li key={card.id} className="mx-auto max-w-sm space-y-1">
                    {editing === card.id ? (
                      <CardForm memberId={member.id} card={card} onDone={() => setEditing(null)} />
                    ) : (
                      <>
                        <PaymentCard
                          card={card}
                          member={member}
                          masked={!isRevealed}
                          className="w-full"
                        />
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className={buttonClass('ghost', 'px-3')}
                            aria-pressed={isRevealed}
                            aria-label={isRevealed ? t.hideNumber : t.showNumber}
                            title={isRevealed ? t.hideNumber : t.showNumber}
                            onClick={() => toggleReveal(card.id)}
                          >
                            {isRevealed ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                          <button
                            type="button"
                            className={buttonClass('ghost', 'px-3')}
                            aria-label={az.common.edit}
                            title={az.common.edit}
                            onClick={() => setEditing(card.id)}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            className={buttonClass('danger', 'px-3')}
                            aria-label={az.common.delete}
                            title={az.common.delete}
                            onClick={() => setToDelete(card)}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {editing === 'new' ? (
            <CardForm memberId={member.id} onDone={() => setEditing(null)} />
          ) : (
            <button
              type="button"
              className={buttonClass('secondary', 'w-full')}
              onClick={() => setEditing('new')}
            >
              <PlusIcon />
              {t.addCard}
            </button>
          )}
          {error && <ErrorText>{error}</ErrorText>}
        </div>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title={t.deleteCardTitle}
        confirmLabel={az.common.delete}
        destructive
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      >
        {toDelete && t.deleteCardBody(maskCardNumber(toDelete.cardNumber))}
      </ConfirmDialog>
    </Card>
  );
}

function ColorSection({ member }: { member: Member }) {
  const actions = useActions();
  const { error, run } = useSubmit();
  const current = memberColor(member);
  return (
    <Card>
      <SectionTitle>{t.colorTitle}</SectionTitle>
      <ColorSwatches
        label={t.colorTitle}
        current={current}
        onPick={(color) => {
          if (color !== current) void run(() => actions.setMemberColor(member.id, color));
        }}
      />
      {error && <p className="mt-1 text-sm text-neg">{error}</p>}
    </Card>
  );
}

/** Password and sign-out. Local mode has no account, so nothing is shown there. */
function AccountSection() {
  const backend = useBackend();
  const account = useAccount();
  const [signingOut, setSigningOut] = useState(false);
  if (backend.mode !== 'supabase' || !account) return null;
  return (
    <>
      <ChangePasswordCard client={backend.client} />
      <button
        type="button"
        className={buttonClass('secondary', 'w-full')}
        disabled={signingOut}
        onClick={async () => {
          setSigningOut(true);
          await account.signOut();
        }}
      >
        {az.auth.signOut}
      </button>
    </>
  );
}
