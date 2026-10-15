// Error types and the final error handlers. Every API error is JSON:
//   { "error": "message", "fields": { "email": "message" } }   (fields only for validation errors)

class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

function apiNotFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, fields: err.fields });
  }
  // Malformed or oversized JSON from express.json()
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res.status(400).json({ error: 'The request body is not valid.' });
  }
  console.error(`${req.method} ${req.originalUrl} failed:`, err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
}

module.exports = { HttpError, apiNotFound, errorHandler };
