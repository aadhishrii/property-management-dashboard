import { incrementUnitNumber } from './unitNumber'

// incrementUnitNumber is a pure function — given a string it returns a string.
// No setup, no mocking, no async. The simplest kind of test to write and explain.

describe('incrementUnitNumber', () => {

  // ── Standard German property unit patterns ──────────────

  describe('standard patterns', () => {
    it('increments W-14 to W-15', () => {
      expect(incrementUnitNumber('W-14')).toBe('W-15')
    })

    it('increments W-01 to W-2', () => {
      // Note: does not preserve leading zeros — W-01 → W-2 not W-02
      // This is intentional — we don't re-pad after increment
      expect(incrementUnitNumber('W-01')).toBe('W-2')
    })

    it('increments TG-05 to TG-6 (parking spots)', () => {
      expect(incrementUnitNumber('TG-05')).toBe('TG-6')
    })

    it('increments TG-09 to TG-10 (handles transition)', () => {
      expect(incrementUnitNumber('TG-09')).toBe('TG-10')
    })

    it('increments A.3 to A.4 (dot separator)', () => {
      expect(incrementUnitNumber('A.3')).toBe('A.4')
    })

    it('increments plain number 42 to 43', () => {
      expect(incrementUnitNumber('42')).toBe('43')
    })

    it('increments single digit 1 to 2', () => {
      expect(incrementUnitNumber('1')).toBe('2')
    })
  })

  // ── Large numbers ───────────────────────────────────────

  describe('large numbers', () => {
    it('handles W-999 → W-1000', () => {
      expect(incrementUnitNumber('W-999')).toBe('W-1000')
    })

    it('handles W-99 → W-100', () => {
      expect(incrementUnitNumber('W-99')).toBe('W-100')
    })

    it('handles three digit numbers', () => {
      expect(incrementUnitNumber('W-101')).toBe('W-102')
    })
  })

  // ── Prefixes with spaces ────────────────────────────────

  describe('prefixes with spaces', () => {
    it('handles Unit 5 → Unit 6', () => {
      expect(incrementUnitNumber('Unit 5')).toBe('Unit 6')
    })

    it('handles Apartment 12 → Apartment 13', () => {
      expect(incrementUnitNumber('Apartment 12')).toBe('Apartment 13')
    })
  })

  // ── Multiple separators ─────────────────────────────────

  describe('multiple separators', () => {
    it('handles A-B-3 → A-B-4', () => {
      expect(incrementUnitNumber('A-B-3')).toBe('A-B-4')
    })

    it('increments only the trailing number', () => {
      // Should increment 5, not 2
      expect(incrementUnitNumber('B2-5')).toBe('B2-6')
    })
  })

  // ── No number found — fallback ──────────────────────────

  describe('no trailing number fallback', () => {
    it('appends -copy when no number found', () => {
      expect(incrementUnitNumber('ROOF')).toBe('ROOF-copy')
    })

    it('appends -copy for empty string', () => {
      expect(incrementUnitNumber('')).toBe('-copy')
    })

    it('appends -copy for all-letter string', () => {
      expect(incrementUnitNumber('ABC')).toBe('ABC-copy')
    })

    it('handles number at start but not end — 3B gets -copy', () => {
      // Our regex looks for trailing numbers only
      // "3B" ends with a letter so no match → -copy
      expect(incrementUnitNumber('3B')).toBe('3B-copy')
    })
  })

  // ── Real PDF data patterns ──────────────────────────────
  // These are the actual unit numbers from the Teilungserklärung test PDF

  describe('real PDF patterns', () => {
    it('handles 01 → 2 (zero-padded from PDF)', () => {
      expect(incrementUnitNumber('01')).toBe('2')
    })

    it('handles 13 → 14 (last parking spot to next)', () => {
      expect(incrementUnitNumber('13')).toBe('14')
    })

    it('handles 14 → 15 (last unit in PDF)', () => {
      expect(incrementUnitNumber('14')).toBe('15')
    })
  })
})