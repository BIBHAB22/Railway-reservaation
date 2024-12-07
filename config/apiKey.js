const crypto = require('crypto');

// Generate a secure random API key
function generateAdminApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Validate API key format
function validateApiKey(apiKey) {
  // Example validation: check if it's a non-empty string of certain length
  return typeof apiKey === 'string' 
    && apiKey.length === 64  // 32 bytes * 2 (hex representation)
    && /^[0-9a-f]+$/.test(apiKey);
}

module.exports = {
  generateAdminApiKey,
  validateApiKey
};