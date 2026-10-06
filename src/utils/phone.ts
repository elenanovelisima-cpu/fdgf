/**
 * Phone normalization and comparison utility
 */

export function canonicalPhone(raw?: string | null): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits || digits.length < 6) return digits;

  // Spanish phone number normalization
  if (digits.startsWith('0034')) {
    return '34' + digits.slice(4);
  }
  if (digits.startsWith('34') && digits.length >= 11) {
    return digits;
  }
  if (digits.length === 9) {
    return '34' + digits;
  }
  if (digits.length > 9 && digits.slice(-9).startsWith('6') || digits.slice(-9).startsWith('7')) {
    // Mobile trailing
    return '34' + digits.slice(-9);
  }

  return digits;
}

export function formatPhoneNumber(phone: string): string {
  const norm = canonicalPhone(phone);
  if (!norm) return phone || '';

  if (norm.startsWith('34') && norm.length === 11) {
    const national = norm.slice(2);
    return `+34 ${national.slice(0, 3)} ${national.slice(3, 5)} ${national.slice(5, 7)} ${national.slice(7, 9)}`;
  }

  return phone;
}
