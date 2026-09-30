import { describe, expect, it } from 'vitest';
import { formatTimestamp } from './format-time';

describe('formatTimestamp', () => {
  it('keeps UTC as the default display and labels the zone', () => {
    expect(formatTimestamp('2026-09-30T12:00:00.000Z', 'UTC')).toContain('12:00 PM UTC');
  });

  it('renders the same instant in a selected market timezone', () => {
    expect(formatTimestamp('2026-09-30T12:00:00.000Z', 'Asia/Seoul')).toContain('9:00 PM GMT+9');
  });

  it('handles absent or invalid timestamps without throwing', () => {
    expect(formatTimestamp(null, 'UTC')).toBe('time unavailable');
    expect(formatTimestamp('not-a-time', 'UTC')).toBe('time unavailable');
  });
});
