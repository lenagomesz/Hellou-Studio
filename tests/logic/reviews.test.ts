import { describe, it, expect } from 'vitest';

interface Review {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  comment: string | null;
}

function canSubmitReview(params: {
  isLoggedIn: boolean;
  hasPurchased: boolean;
  existingReviews: Review[];
  userId: string;
}): { allowed: boolean; reason?: string } {
  if (!params.isLoggedIn) {
    return { allowed: false, reason: 'not_logged_in' };
  }
  if (!params.hasPurchased) {
    return { allowed: false, reason: 'not_purchased' };
  }
  const alreadyReviewed = params.existingReviews.some(r => r.user_id === params.userId);
  if (alreadyReviewed) {
    return { allowed: false, reason: 'already_reviewed' };
  }
  return { allowed: true };
}

function validateRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

function calculateAverageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

describe('Reviews Logic', () => {
  describe('canSubmitReview', () => {
    it('should allow logged in user who purchased and has not reviewed', () => {
      const result = canSubmitReview({
        isLoggedIn: true,
        hasPurchased: true,
        existingReviews: [],
        userId: 'user-1',
      });
      expect(result.allowed).toBe(true);
    });

    it('should reject unauthenticated users', () => {
      const result = canSubmitReview({
        isLoggedIn: false,
        hasPurchased: true,
        existingReviews: [],
        userId: 'user-1',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('not_logged_in');
    });

    it('should reject users who have not purchased', () => {
      const result = canSubmitReview({
        isLoggedIn: true,
        hasPurchased: false,
        existingReviews: [],
        userId: 'user-1',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('not_purchased');
    });

    it('should reject users who already reviewed', () => {
      const result = canSubmitReview({
        isLoggedIn: true,
        hasPurchased: true,
        existingReviews: [
          { id: 'r1', user_id: 'user-1', product_id: 'p1', rating: 5, comment: null },
        ],
        userId: 'user-1',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('already_reviewed');
    });

    it('should allow user when others have reviewed but they have not', () => {
      const result = canSubmitReview({
        isLoggedIn: true,
        hasPurchased: true,
        existingReviews: [
          { id: 'r1', user_id: 'user-2', product_id: 'p1', rating: 4, comment: 'Nice' },
        ],
        userId: 'user-1',
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe('validateRating', () => {
    it('should accept ratings 1-5', () => {
      expect(validateRating(1)).toBe(true);
      expect(validateRating(2)).toBe(true);
      expect(validateRating(3)).toBe(true);
      expect(validateRating(4)).toBe(true);
      expect(validateRating(5)).toBe(true);
    });

    it('should reject ratings outside 1-5', () => {
      expect(validateRating(0)).toBe(false);
      expect(validateRating(6)).toBe(false);
      expect(validateRating(-1)).toBe(false);
    });

    it('should reject non-integer ratings', () => {
      expect(validateRating(3.5)).toBe(false);
      expect(validateRating(4.2)).toBe(false);
    });
  });

  describe('calculateAverageRating', () => {
    it('should return 0 for empty reviews', () => {
      expect(calculateAverageRating([])).toBe(0);
    });

    it('should calculate average correctly', () => {
      const reviews: Review[] = [
        { id: '1', user_id: 'u1', product_id: 'p1', rating: 5, comment: null },
        { id: '2', user_id: 'u2', product_id: 'p1', rating: 3, comment: null },
        { id: '3', user_id: 'u3', product_id: 'p1', rating: 4, comment: null },
      ];
      expect(calculateAverageRating(reviews)).toBe(4);
    });

    it('should round to 1 decimal place', () => {
      const reviews: Review[] = [
        { id: '1', user_id: 'u1', product_id: 'p1', rating: 5, comment: null },
        { id: '2', user_id: 'u2', product_id: 'p1', rating: 4, comment: null },
        { id: '3', user_id: 'u3', product_id: 'p1', rating: 4, comment: null },
      ];
      expect(calculateAverageRating(reviews)).toBe(4.3);
    });
  });
});
