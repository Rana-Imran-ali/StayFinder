import React, { useState } from 'react';
import type { Booking } from '../types/booking';
import { reviewApi } from '../services/reviewApi';
import type { SubmitReviewPayload } from '../services/reviewApi';
import { Star, X, Loader2, CheckCircle2 } from 'lucide-react';

interface WriteReviewModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted?: () => void;
}

const CATEGORIES = [
  { key: 'cleanliness_rating', label: 'Cleanliness', desc: 'Was the space spotless and tidy?' },
  { key: 'accuracy_rating', label: 'Accuracy', desc: 'Did photos and description match reality?' },
  { key: 'checkin_rating', label: 'Check-in', desc: 'Was the arrival and key handover smooth?' },
  { key: 'communication_rating', label: 'Communication', desc: 'Was the host responsive and helpful?' },
  { key: 'location_rating', label: 'Location', desc: 'Was the neighborhood convenient and safe?' },
  { key: 'value_rating', label: 'Value', desc: 'Did the stay justify the price paid?' },
] as const;

export const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  booking,
  isOpen,
  onClose,
  onReviewSubmitted,
}) => {
  const [ratings, setRatings] = useState<Record<string, number>>({
    cleanliness_rating: 5,
    accuracy_rating: 5,
    checkin_rating: 5,
    communication_rating: 5,
    location_rating: 5,
    value_rating: 5,
  });

  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !booking) return null;

  const handleRatingChange = (key: string, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: SubmitReviewPayload = {
      cleanliness_rating: ratings.cleanliness_rating,
      accuracy_rating: ratings.accuracy_rating,
      checkin_rating: ratings.checkin_rating,
      communication_rating: ratings.communication_rating,
      location_rating: ratings.location_rating,
      value_rating: ratings.value_rating,
      comment: comment.trim() || undefined,
    };

    try {
      await reviewApi.submitReview(booking.id, payload);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onReviewSubmitted) onReviewSubmitted();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit review. You may have already reviewed this booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const overallAvg = (
    Object.values(ratings).reduce((acc, curr) => acc + curr, 0) / 6
  ).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Review Your Stay</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {booking.property?.title || 'Your Stay'} ({booking.check_in} — {booking.check_out})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center py-10 space-y-3">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto animate-bounce" />
              <h3 className="text-lg font-bold text-slate-900">Thank you for your feedback!</h3>
              <p className="text-xs text-slate-500">
                Your review helps other travelers make great booking choices.
              </p>
            </div>
          ) : (
            <>
              {/* Overall Score Badge */}
              <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                    Average Score
                  </span>
                  <span className="text-2xl font-black text-slate-900">{overallAvg} / 5.0</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={20}
                      fill={s <= Math.round(Number(overallAvg)) ? '#f59e0b' : 'none'}
                      color={s <= Math.round(Number(overallAvg)) ? '#f59e0b' : '#cbd5e1'}
                    />
                  ))}
                </div>
              </div>

              {/* Rating Categories */}
              <div className="space-y-4">
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat.key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-xl hover:bg-slate-50/80 transition-colors"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{cat.label}</h4>
                      <p className="text-[11px] text-slate-400">{cat.desc}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-1 sm:pt-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRatingChange(cat.key, star)}
                          className="p-1 hover:scale-110 transition-transform"
                          title={`${star} stars`}
                        >
                          <Star
                            size={18}
                            fill={star <= (ratings[cat.key] || 5) ? '#f59e0b' : 'none'}
                            color={star <= (ratings[cat.key] || 5) ? '#f59e0b' : '#cbd5e1'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Feedback Comment */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Detailed Experience (Optional)
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What made this place special? Any tips for future travelers?"
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-700 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Submit Review
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
