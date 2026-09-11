export const MASTERY_TRUTH_OWNER = 'D5/runtime';

export const KNOWLEDGE_STATES = Object.freeze(new Set([
  'UNSEEN',
  'INTRODUCED',
  'LEARNING',
  'STABLE',
  'MASTERED_FOR_NOW',
  'REVIEW_DUE',
  'LAPSED',
]));

const MAX_MASTERY_ROWS = 10000;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requireFiniteNumber(value, label, {min = -Infinity, max = Infinity} = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be a finite number in range ${min}..${max}`);
  }
  return value;
}

function requireNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function requireNullableTimestamp(value, label) {
  if (value === null) return null;
  if (typeof value !== 'string' || !value.trim() || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be null or an ISO timestamp string`);
  }
  return value;
}

export function validateMasteryPayload(data) {
  if (!isRecord(data)) throw new Error('mastery response must be an object');
  if (data.truth_owner !== MASTERY_TRUTH_OWNER) {
    throw new Error('mastery response is not owned by D5/runtime');
  }
  if (!Array.isArray(data.mastery)) throw new Error('mastery response must contain a mastery array');
  if (data.mastery.length > MAX_MASTERY_ROWS) throw new Error('mastery response exceeds the supported row limit');

  const seen = new Set();
  return data.mastery.map((raw, index) => {
    const prefix = `mastery[${index}]`;
    if (!isRecord(raw)) throw new Error(`${prefix} must be an object`);
    const conceptId = requireNonEmptyString(raw.concept_id, `${prefix}.concept_id`);
    if (seen.has(conceptId)) throw new Error(`duplicate mastery concept_id: ${conceptId}`);
    seen.add(conceptId);

    const state = requireNonEmptyString(raw.state, `${prefix}.state`);
    if (!KNOWLEDGE_STATES.has(state)) throw new Error(`${prefix}.state is not a known runtime KnowledgeState`);

    return Object.freeze({
      concept_id: conceptId,
      state,
      stability_days: requireFiniteNumber(raw.stability_days, `${prefix}.stability_days`, {min: 0}),
      difficulty: requireFiniteNumber(raw.difficulty, `${prefix}.difficulty`, {min: 0, max: 1}),
      consecutive_independent_successes: requireNonNegativeInteger(
        raw.consecutive_independent_successes,
        `${prefix}.consecutive_independent_successes`,
      ),
      guided_successes: requireNonNegativeInteger(raw.guided_successes, `${prefix}.guided_successes`),
      failures: requireNonNegativeInteger(raw.failures, `${prefix}.failures`),
      last_seen_at: requireNullableTimestamp(raw.last_seen_at, `${prefix}.last_seen_at`),
      due_at: requireNullableTimestamp(raw.due_at, `${prefix}.due_at`),
    });
  });
}

export class MasteryRequestGuard {
  constructor() {
    this.generation = 0;
    this.active = false;
  }

  begin() {
    this.active = true;
    this.generation += 1;
    return this.generation;
  }

  invalidate() {
    this.active = false;
    this.generation += 1;
  }

  owns(token) {
    return this.active && token === this.generation;
  }

  isActive() {
    return this.active;
  }
}
