// Wraps an async Express route handler so a rejected promise (e.g. a
// downstream factor-service call failing) reaches next(err) instead of
// becoming an unhandled rejection that hangs the request.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { asyncHandler };
