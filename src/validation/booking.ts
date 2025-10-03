// Centralized validation for booking inputs
export const phoneRegex = /^09\d{9}$/; // starts with 09 and exactly 11 digits

export function validatePhone(phone: string): boolean {
  return phoneRegex.test(phone);
}
