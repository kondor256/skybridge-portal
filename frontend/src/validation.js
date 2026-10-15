// Form rules for the browser. The server checks the same rules again
// (backend/src/middleware/validate.js); these give the visitor fast feedback.
// Each rule returns an error message or '' when the value is fine.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const NAME = /^\p{L}[\p{L} .'-]*$/u;

export const rules = {
  fullName(value) {
    const v = value.trim();
    if (v.length < 2 || v.length > 100) return 'Enter your full name (2 to 100 characters).';
    if (!NAME.test(v)) return 'Name can contain letters, spaces, hyphens and apostrophes only.';
    return '';
  },
  email(value) {
    const v = value.trim();
    if (!v) return 'Enter your email address.';
    if (v.length > 254 || !EMAIL.test(v)) return 'Enter a valid email address, for example name@company.co.nz.';
    return '';
  },
  optionalPhone(value) {
    const v = value.trim();
    return v && !PHONE.test(v) ? 'Enter a valid phone number (7 to 20 digits).' : '';
  },
  phone(value) {
    const v = value.trim();
    if (!v) return 'Enter a contact phone number.';
    return PHONE.test(v) ? '' : 'Enter a valid phone number (7 to 20 digits).';
  },
  newPassword(value) {
    if (value.length < 8) return 'Password must be at least 8 characters.';
    if (value.length > 72) return 'Password must be 72 characters or fewer.';
    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
      return 'Password must contain an upper-case letter, a lower-case letter and a number.';
    }
    return '';
  },
  password(value) {
    return value ? '' : 'Enter your password.';
  },
  companyName(value) {
    const v = value.trim();
    return v.length < 2 || v.length > 120 ? 'Enter your organisation name (2 to 120 characters).' : '';
  },
};

// Password checklist shown under the field while typing.
export function passwordChecks(value) {
  return [
    { label: 'At least 8 characters', ok: value.length >= 8 },
    { label: 'An upper-case letter', ok: /[A-Z]/.test(value) },
    { label: 'A lower-case letter', ok: /[a-z]/.test(value) },
    { label: 'A number', ok: /[0-9]/.test(value) },
  ];
}

// True when focus is moving to the form's submit button. Showing or hiding an
// error message at that moment moves the button, and the click would miss it;
// the submit handler validates every field anyway.
export const movingToSubmit = (event) => event?.relatedTarget?.type === 'submit';
