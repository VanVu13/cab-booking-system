/**
 * Log Masker - Masks sensitive data in logs
 * Prevents PII from leaking into log output
 */

const SENSITIVE_FIELDS = ['email', 'phone', 'token', 'password', 'secret', 'authorization', 'creditCard', 'cardNumber'];

/**
 * Mask a string value based on field name
 */
function maskValue(key, value) {
    if (!value || typeof value !== 'string') return value;

    const lowerKey = key.toLowerCase();

    if (lowerKey.includes('email')) {
        return value.replace(/(.{2}).+(@.+)/, '$1***$2');
    }
    if (lowerKey.includes('phone')) {
        return value.replace(/(\d{3})\d+(\d{3})/, '$1****$2');
    }
    if (lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('password') || lowerKey.includes('authorization')) {
        return value.length > 8 ? value.substring(0, 4) + '***REDACTED***' : '***REDACTED***';
    }
    if (lowerKey.includes('card')) {
        return value.replace(/\d(?=\d{4})/g, '*');
    }

    return value;
}

/**
 * Deep mask an object, returning a new object with sensitive fields masked
 */
function maskSensitive(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => maskSensitive(item));
    }

    const masked = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
            masked[key] = maskSensitive(value);
        } else if (typeof value === 'string' && SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f))) {
            masked[key] = maskValue(key, value);
        } else {
            masked[key] = value;
        }
    }
    return masked;
}

/**
 * Secure logger wrapper - automatically masks sensitive data
 */
function secureLog(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message };

    if (data) {
        logEntry.data = maskSensitive(data);
    }

    switch (level) {
        case 'error':
            console.error(JSON.stringify(logEntry));
            break;
        case 'warn':
            console.warn(JSON.stringify(logEntry));
            break;
        case 'info':
            console.log(JSON.stringify(logEntry));
            break;
        default:
            console.log(JSON.stringify(logEntry));
    }
}

module.exports = { maskSensitive, maskValue, secureLog };
