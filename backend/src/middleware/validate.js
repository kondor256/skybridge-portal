// Server-side validation. The front end checks the same rules, but the server
// never trusts the browser. Each function returns clean values or throws a 400
// with one message per field.
const { HttpError } = require('./error');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[0-9 ()-]{7,20}$/;
const NAME = /^\p{L}[\p{L} .'-]*$/u;
const UNITS = ['project', 'month', 'day'];

const text = (value) => (typeof value === 'string' ? value.trim() : '');

function finish(fields, values) {
  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, 'Please correct the highlighted fields.', fields);
  }
  return values;
}

function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 72) return 'Password must be 72 characters or fewer.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain an upper-case letter, a lower-case letter and a number.';
  }
  return null;
}

function validateRegistration(body = {}) {
  const fields = {};
  const fullName = text(body.fullName);
  const email = text(body.email).toLowerCase();
  const phone = text(body.phone);

  if (fullName.length < 2 || fullName.length > 100) fields.fullName = 'Enter your full name (2 to 100 characters).';
  else if (!NAME.test(fullName)) fields.fullName = 'Name can contain letters, spaces, hyphens and apostrophes only.';

  if (!email) fields.email = 'Enter your email address.';
  else if (email.length > 254 || !EMAIL.test(email)) fields.email = 'Enter a valid email address, for example name@company.co.nz.';

  if (phone && !PHONE.test(phone)) fields.phone = 'Enter a valid phone number (7 to 20 digits).';

  const problem = passwordProblem(body.password);
  if (problem) fields.password = problem;

  if (body.confirmPassword !== body.password) fields.confirmPassword = 'The two passwords do not match.';

  return finish(fields, { fullName, email, phone: phone || null, password: body.password });
}

function validateLogin(body = {}) {
  const fields = {};
  const email = text(body.email).toLowerCase();
  if (!email) fields.email = 'Enter your email address.';
  else if (!EMAIL.test(email)) fields.email = 'Enter a valid email address.';
  if (typeof body.password !== 'string' || body.password.length === 0) fields.password = 'Enter your password.';
  return finish(fields, { email, password: body.password });
}

function validateQuantity(value) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    throw new HttpError(400, 'Quantity must be a whole number from 1 to 99.', { quantity: 'Quantity must be from 1 to 99.' });
  }
  return quantity;
}

// Route parameter -> positive integer id, or 404 (an id like "abc" cannot exist).
function parseId(value) {
  if (!/^[1-9][0-9]{0,8}$/.test(String(value))) {
    throw new HttpError(404, 'Not found');
  }
  return Number(value);
}

function validateCheckout(body = {}) {
  const fields = {};
  const companyName = text(body.companyName);
  const contactPhone = text(body.contactPhone);
  const notes = text(body.notes);

  if (companyName.length < 2 || companyName.length > 120) fields.companyName = 'Enter your organisation name (2 to 120 characters).';
  if (!contactPhone) fields.contactPhone = 'Enter a contact phone number.';
  else if (!PHONE.test(contactPhone)) fields.contactPhone = 'Enter a valid phone number (7 to 20 digits).';
  if (notes.length > 1000) fields.notes = 'Notes must be 1000 characters or fewer.';

  return finish(fields, { companyName, contactPhone, notes });
}

function validateProduct(body = {}) {
  const fields = {};
  const name = text(body.name);
  const summary = text(body.summary);
  const description = text(body.description);
  const duration = text(body.duration);
  const imageUrl = text(body.imageUrl);
  const unit = text(body.unit) || 'project';
  const categoryId = Number(body.categoryId);
  const price = typeof body.price === 'string' && body.price.trim() === '' ? NaN : Number(body.price);
  const features = Array.isArray(body.features) ? body.features.map(text).filter(Boolean) : [];

  if (name.length < 3 || name.length > 120) fields.name = 'Enter a name (3 to 120 characters).';
  if (!Number.isInteger(categoryId) || categoryId < 1) fields.categoryId = 'Choose a category.';
  if (summary.length < 10 || summary.length > 255) fields.summary = 'Enter a summary (10 to 255 characters).';
  if (description.length > 5000) fields.description = 'Description must be 5000 characters or fewer.';
  if (body.price === null || body.price === undefined || !Number.isFinite(price)) fields.price = 'Enter a price.';
  else if (price < 0 || price > 9999999.99) fields.price = 'Price must be between 0 and 9,999,999.99.';
  else if (Math.round(price * 100) !== Number((price * 100).toFixed(6))) fields.price = 'Price can have at most two decimal places.';
  if (!UNITS.includes(unit)) fields.unit = 'Choose a pricing unit.';
  if (duration.length > 60) fields.duration = 'Duration must be 60 characters or fewer.';
  if (imageUrl.length > 500 || (imageUrl && !/^(\/img\/[\w.-]+|https:\/\/\S+)$/.test(imageUrl))) {
    fields.imageUrl = 'Choose an image from the list or enter an https:// address.';
  }
  if (features.length > 10 || features.some((f) => f.length > 200)) {
    fields.features = 'Enter at most 10 items, each 200 characters or fewer.';
  }

  return finish(fields, {
    name, summary, description, duration, imageUrl, unit, categoryId, price, features,
    isActive: body.isActive !== false,
  });
}

module.exports = {
  validateRegistration,
  validateLogin,
  validateQuantity,
  validateCheckout,
  validateProduct,
  parseId,
};
