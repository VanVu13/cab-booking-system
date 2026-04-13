/**
 * Decision Logger - Structured logging for AI matching decisions
 * Logs every driver selection decision with full context for auditing
 */

/**
 * Log a matching decision
 * @param {string} rideId - Ride identifier
 * @param {object} decision - Decision details
 * @param {string} decision.reason - Decision reason code
 * @param {string} decision.model_version - Algorithm version used
 * @param {boolean} decision.fallback - Whether fallback was used
 * @param {number} decision.candidatesTotal - Total candidate drivers
 * @param {string} decision.selectedDriverId - Selected driver ID
 * @param {Array} decision.topScores - Top-3 scored drivers
 * @param {object} decision.context - Ride context (pickup, vehicleType, etc)
 */
function logDecision(rideId, decision) {
    const log = {
        timestamp: new Date().toISOString(),
        type: 'AI_DECISION',
        rideId,
        reason: decision.reason || 'UNKNOWN',
        model_version: decision.model_version || 'unknown',
        fallback: decision.fallback || false,
        candidatesTotal: decision.candidatesTotal || 0,
        selectedDriverId: decision.selectedDriverId || null,
        topScores: decision.topScores || [],
        contextMissing: decision.contextMissing || [],
        processingTimeMs: decision.processingTimeMs || 0
    };

    console.log(`[AI_DECISION] ${JSON.stringify(log)}`);
    return log;
}

/**
 * Log a matching failure
 */
function logMatchFailed(rideId, reason, details = {}) {
    const log = {
        timestamp: new Date().toISOString(),
        type: 'AI_MATCH_FAILED',
        rideId,
        reason,
        ...details
    };
    console.warn(`[AI_MATCH_FAILED] ${JSON.stringify(log)}`);
    return log;
}

/**
 * Log context validation issues
 */
function logContextMissing(rideId, missingFields) {
    const log = {
        timestamp: new Date().toISOString(),
        type: 'AI_CONTEXT_WARNING',
        rideId,
        missingFields,
        message: `Missing context fields: ${missingFields.join(', ')}`
    };
    console.warn(`[AI_CONTEXT_WARNING] ${JSON.stringify(log)}`);
    return log;
}

module.exports = { logDecision, logMatchFailed, logContextMissing };
