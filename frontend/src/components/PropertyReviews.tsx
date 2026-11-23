import React, { useState, useEffect } from 'react';
import { Star, User } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Review {
  id: number;
  booking_id: number;
  property_id: number;
  guest_id: number;
  guest?: { id: number; name: string; profile_photo_path?: string };
  cleanliness_rating: number;
  accuracy_rating: number;
  checkin_rating: number;
  communication_rating: number;
  location_rating: number;
  value_rating: number;
  overall_rating: number;
  comment?: string;
  host_reply?: string;
  host_replied_at?: string;
  created_at: string;
}

interface ReviewFormData {
  cleanliness_rating: number;
  accuracy_rating: number;
  checkin_rating: number;
  communication_rating: number;
  location_rating: number;
  value_rating: number;
  comment: string;
}

const RatingBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
    <span style={{ width: '130px', fontSize: '0.85rem', color: '#555' }}>{label}</span>
    <div style={{ flex: 1, background: '#e0e0e0', borderRadius: '4px', height: '4px' }}>
      <div style={{ width: `${(value / 5) * 100}%`, background: '#222', height: '4px', borderRadius: '4px', transition: 'width 0.3s' }} />
    </div>
    <span style={{ width: '28px', fontSize: '0.85rem', fontWeight: 600, color: '#222' }}>{value.toFixed(1)}</span>
  </div>
);

const StarRating: React.FC<{ value: number; onChange?: (v: number) => void; readOnly?: boolean }> = ({
  value, onChange, readOnly = false,
}) => (
  <div style={{ display: 'flex', gap: '2px' }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={readOnly ? 14 : 20}
        fill={star <= value ? '#FF385C' : 'none'}
        stroke={star <= value ? '#FF385C' : '#aaa'}
        style={{ cursor: readOnly ? 'default' : 'pointer', transition: 'transform 0.1s' }}
        onClick={() => !readOnly && onChange?.(star)}
      />
    ))}
  </div>
);

interface Props {
  propertyId: number;
  hostId?: number;
}

export const PropertyReviews: React.FC<Props> = ({ propertyId, hostId }) => {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ReviewFormData>({
    cleanliness_rating: 5,
    accuracy_rating: 5,
    checkin_rating: 5,
    communication_rating: 5,
    location_rating: 5,
    value_rating: 5,
    comment: '',
  });
  const [eligibleBookingId, setEligibleBookingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  useEffect(() => {
    fetchReviews();
    if (isAuthenticated) {
      checkEligibility();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, isAuthenticated]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res: any = await api.get(`/properties/${propertyId}/reviews`);
      const list: Review[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : res?.data?.data ?? [];
      setReviews(list);
      if (list.length > 0) {
        const avg = list.reduce((acc, r) => acc + r.overall_rating, 0) / list.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  };

  const checkEligibility = async () => {
    try {
      const res: any = await api.get('/bookings');
      const bookings = Array.isArray(res?.data)
        ? res.data
        : res?.data?.data ?? (Array.isArray(res) ? res : []);
      const eligible = bookings.find(
        (b: any) =>
          b.property_id === propertyId &&
          b.status === 'completed' &&
          !reviews.find((r) => r.booking_id === b.id),
      );
      if (eligible) setEligibleBookingId(eligible.id);
    } catch {
      /* silent */
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibleBookingId) return;
    setSubmitting(true);
    try {
      await api.post(`/bookings/${eligibleBookingId}/review`, formData);
      setShowForm(false);
      setEligibleBookingId(null);
      await fetchReviews();
    } catch (err: any) {
      alert(err?.response?.data?.message ?? 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHostReply = async (reviewId: number) => {
    if (!replyText.trim()) return;
    try {
      await api.post(`/reviews/${reviewId}/host-reply`, { host_reply: replyText });
      setReplyingTo(null);
      setReplyText('');
      await fetchReviews();
    } catch {
      alert('Failed to post reply.');
    }
  };

  const ratingCategories = [
    { label: 'Cleanliness', key: 'cleanliness_rating' as keyof ReviewFormData },
    { label: 'Accuracy', key: 'accuracy_rating' as keyof ReviewFormData },
    { label: 'Check-in', key: 'checkin_rating' as keyof ReviewFormData },
    { label: 'Communication', key: 'communication_rating' as keyof ReviewFormData },
    { label: 'Location', key: 'location_rating' as keyof ReviewFormData },
    { label: 'Value', key: 'value_rating' as keyof ReviewFormData },
  ];

  if (isLoading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading reviews…</div>;

  return (
    <div className="property-reviews" style={{ marginTop: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <Star size={20} fill="#222" stroke="#222" />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#222' }}>
          {reviews.length === 0 ? 'No reviews yet' : `${avgRating} · ${reviews.length} review${reviews.length !== 1 ? 's' : ''}`}
        </h3>
      </div>

      {/* Rating breakdown bars */}
      {reviews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 2rem', marginBottom: '1.5rem' }}>
          {ratingCategories.map((cat) => {
            const avg =
              reviews.reduce((acc, r) => acc + (r[cat.key as keyof Review] as number), 0) / reviews.length;
            return <RatingBar key={cat.key} label={cat.label} value={Math.round(avg * 10) / 10} />;
          })}
        </div>
      )}

      {/* Leave a review CTA */}
      {isAuthenticated && eligibleBookingId && !showForm && (
        <button
          className="btn-primary"
          style={{ marginBottom: '1.5rem' }}
          onClick={() => setShowForm(true)}
        >
          Leave a Review
        </button>
      )}

      {/* Review form */}
      {showForm && (
        <form
          onSubmit={handleSubmitReview}
          style={{ background: '#f8f8f8', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid #e5e5e5' }}
        >
          <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Rate your stay</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 2rem', marginBottom: '1rem' }}>
            {ratingCategories.map((cat) => (
              <div key={cat.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#444' }}>{cat.label}</span>
                <StarRating
                  value={formData[cat.key] as number}
                  onChange={(v) => setFormData((f) => ({ ...f, [cat.key]: v }))}
                />
              </div>
            ))}
          </div>
          <textarea
            className="standard-textarea"
            rows={4}
            placeholder="Share your experience with future guests…"
            value={formData.comment}
            onChange={(e) => setFormData((f) => ({ ...f, comment: e.target.value }))}
            style={{ marginBottom: '1rem' }}
          />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Review list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {reviews.map((review) => (
          <div key={review.id} style={{ padding: '1.25rem 0', borderBottom: '1px solid #ebebeb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              {review.guest?.profile_photo_path ? (
                <img
                  src={review.guest.profile_photo_path}
                  alt={review.guest.name}
                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FF385C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} color="#fff" />
                </div>
              )}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{review.guest?.name ?? 'Guest'}</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>
                  {new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>
            <StarRating value={Math.round(review.overall_rating)} readOnly />
            {review.comment && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#333', lineHeight: 1.6 }}>{review.comment}</p>
            )}

            {/* Host reply */}
            {review.host_reply && (
              <div style={{ marginTop: '0.75rem', background: '#f5f5f5', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Response from host</div>
                <p style={{ fontSize: '0.85rem', color: '#444' }}>{review.host_reply}</p>
              </div>
            )}

            {/* Host reply form */}
            {user?.id === hostId && !review.host_reply && (
              <div style={{ marginTop: '0.75rem' }}>
                {replyingTo === review.id ? (
                  <div>
                    <textarea
                      className="standard-textarea"
                      rows={3}
                      placeholder="Write a response to this review…"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      style={{ marginBottom: '0.5rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-primary btn-sm" onClick={() => handleHostReply(review.id)}>
                        Post Reply
                      </button>
                      <button className="btn-secondary btn-sm" onClick={() => setReplyingTo(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => { setReplyingTo(review.id); setReplyText(''); }}
                  >
                    Reply to review
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {reviews.length === 0 && (
        <p style={{ color: '#888', fontSize: '0.95rem' }}>No reviews yet. Be the first to review this property!</p>
      )}
    </div>
  );
};
