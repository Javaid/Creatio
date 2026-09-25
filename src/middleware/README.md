# middleware/

Express middleware: authentication (API key for Creatio calls), request
validation wiring, centralized error handling, structured request
logging, rate limiting. See `docs/SECURITY.md`.

- `requestContext.js` — assigns/echoes `X-Request-Id`, attaches a
  correlation-scoped `req.log`.
- `errorHandler.js` — centralized error handler emitting the uniform
  error envelope from `docs/API-CONTRACT.md` §1.
- Auth (`auth.js`), scope enforcement (`authorize.js`), request validation
  (`validate.js`), and rate limiting are not implemented yet — they land
  with the first real API routes.
