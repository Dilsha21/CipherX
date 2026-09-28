// Trims a string field and treats whitespace-only input as absent, so
// " " doesn't slip past a truthy-string check the way "" would be caught.
function normalizeField(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

module.exports = { normalizeField };
