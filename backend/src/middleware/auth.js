const { HttpError } = require('./error');

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    throw new HttpError(401, 'Please log in to continue.');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    throw new HttpError(401, 'Please log in as an administrator.');
  }
  if (req.session.role !== 'admin') {
    throw new HttpError(403, 'Administrator access is required.');
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
