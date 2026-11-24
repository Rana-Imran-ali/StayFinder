import { api } from './api';

export interface SubmitReviewPayload {
  cleanliness_rating: number;
  accuracy_rating: number;
  checkin_rating: number;
  communication_rating: number;
  location_rating: number;
  value_rating: number;
  comment?: string;
}

export const reviewApi = {
  /**
   * Submit a review for a completed stay.
   */
  submitReview: async (bookingId: number, payload: SubmitReviewPayload) => {
    return api.post(`/bookings/${bookingId}/review`, payload);
  },

  /**
   * Get public reviews for a property.
   */
  getPropertyReviews: async (propertyId: number, page: number = 1) => {
    return api.get(`/properties/${propertyId}/reviews?page=${page}`);
  },
};
