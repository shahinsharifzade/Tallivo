import type { Id, IsoDateTime } from './types';

/** A payment card, kept only so others can copy the number. Never add CVV, expiry or PIN. */
export interface MemberCard {
  id: Id;
  memberId: Id;
  label?: string;
  /** Digits only. */
  cardNumber: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export const MAX_CARD_LABEL_LENGTH = 40;
export const MIN_CARD_DIGITS = 13;
export const MAX_CARD_DIGITS = 19;

export function cardDigits(input: string): string {
  return input.replace(/\D/g, '');
}

/** True for digits only, 13-19 of them. The database enforces the same rule. */
export function isCardNumberValid(cardNumber: string): boolean {
  return /^[0-9]{13,19}$/.test(cardNumber);
}

/** Luhn checksum. A failure is only a soft warning in the UI: saving is still allowed. */
export function passesLuhn(cardNumber: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = Number(cardNumber[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return cardNumber.length > 0 && sum % 10 === 0;
}

/** "4111111111111111" -> "4111 1111 1111 1111". */
export function formatCardNumber(cardNumber: string): string {
  return cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** "4111111111111111" -> "•••• 1111". */
export function maskCardNumber(cardNumber: string): string {
  return `•••• ${cardNumber.slice(-4)}`;
}
