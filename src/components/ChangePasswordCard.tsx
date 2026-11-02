// Change password is switched off for now: nothing renders or calls this.
// To bring it back, uncomment the code below and restore <ChangePasswordCard client={backend.client} />
// in AccountSection (src/pages/ProfilePage.tsx). Its texts are still in az.profile.password.
//
// import { useState, type FormEvent } from 'react';
// import type { SupabaseClient } from '@supabase/supabase-js';
// import { az } from '../i18n/az';
// import { useFeedback } from '../state/feedback';
// import { buttonClass, inputClass } from './styles';
// import { Card, ErrorText, Field, SectionTitle } from './ui';
//
// const t = az.profile.password;
//
// const MIN_PASSWORD_LENGTH = 8;
//
// /** Sets a new password for the signed-in account. The password itself is never logged. */
// export function ChangePasswordCard({ client }: { client: SupabaseClient }) {
//   const feedback = useFeedback();
//   const [password, setPassword] = useState('');
//   const [repeat, setRepeat] = useState('');
//   const [pending, setPending] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [submitted, setSubmitted] = useState(false);
//
//   const tooShort = password.length < MIN_PASSWORD_LENGTH;
//   const mismatch = password !== repeat;
//
//   const onSubmit = async (e: FormEvent) => {
//     e.preventDefault();
//     setSubmitted(true);
//     setError(null);
//     if (tooShort || mismatch) return;
//     setPending(true);
//     try {
//       const { error: authError } = await client.auth.updateUser({ password });
//       if (authError) {
//         setError(
//           authError.code === 'same_password'
//             ? t.same
//             : authError.code === 'weak_password'
//               ? t.weak
//               : authError.status === 0
//                 ? az.errors.network
//                 : t.failed,
//         );
//         return;
//       }
//       setPassword('');
//       setRepeat('');
//       setSubmitted(false);
//       feedback.saved();
//     } catch {
//       setError(az.errors.network);
//     } finally {
//       setPending(false);
//     }
//   };
//
//   return (
//     <Card>
//       <SectionTitle>{t.title}</SectionTitle>
//       <form onSubmit={onSubmit} className="space-y-3" noValidate>
//         <Field
//           id="new-password"
//           label={t.next}
//           error={submitted && tooShort ? t.tooShort(MIN_PASSWORD_LENGTH) : null}
//         >
//           <input
//             id="new-password"
//             type="password"
//             autoComplete="new-password"
//             className={inputClass}
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             aria-invalid={submitted && tooShort}
//           />
//         </Field>
//         <Field
//           id="repeat-password"
//           label={t.repeat}
//           error={submitted && mismatch ? t.mismatch : null}
//         >
//           <input
//             id="repeat-password"
//             type="password"
//             autoComplete="new-password"
//             className={inputClass}
//             value={repeat}
//             onChange={(e) => setRepeat(e.target.value)}
//             aria-invalid={submitted && mismatch}
//           />
//         </Field>
//         {error && <ErrorText>{error}</ErrorText>}
//         <button type="submit" className={buttonClass('primary')} disabled={pending}>
//           {pending ? az.common.saving : t.submit}
//         </button>
//       </form>
//     </Card>
//   );
// }

export {};
