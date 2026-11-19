import React, { useState, useEffect, useCallback } from 'react';
import type { Booking } from '../types/booking';
import { bookingApi } from '../services/bookingApi';
import { BookingDetailsModal } from './BookingDetailsModal';
import {
  Luggage,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface MyTripsViewProps {
  onExploreStays?: () => void;
}

export const MyTripsView: React.FC<MyTripsViewProps> = ({ onExploreStays }) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled' | 'all'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchTrips = useCallback(async (tab: 'upcoming' | 'past' | 'cancelled' | 'all', page: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.getBookings(tab, page);
      if (res.success && res.data) {
        setBookings(res.data.data);
        setCurrentPage(res.data.current_page);
        setLastPage(res.data.last_page);
      } else {
        setBookings([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your trips.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips(activeTab, currentPage);
  }, [activeTab, currentPage, fetchTrips]);

  const handleBookingCancelled = (updated: Booking) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setSelectedBooking(updated);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Luggage size={28} className="text-rose-600" />
            My Trips
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your past and upcoming travel itineraries, receipts, and reservations.
          </p>
        </div>

        {onExploreStays && (
          <button
            type="button"
            onClick={onExploreStays}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200 transition-all self-start sm:self-auto"
          >
            Explore Places to Stay
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 mb-6">
        {(['upcoming', 'past', 'cancelled', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
            className={`pb-3 text-sm font-bold capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {tab === 'past' ? 'Past Stays' : tab}
          </button>
        ))}
      </div>

      {/* Error Notice */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 size={32} className="animate-spin text-rose-500" />
          <span className="text-xs font-semibold">Loading your travel reservations...</span>
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl p-8 bg-slate-50/50">
          <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-4 shadow-sm">
            <Luggage size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No {activeTab} trips found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            When you book accommodations on StayFinder, your reservation codes and details will show up right here.
          </p>
          {onExploreStays && (
            <button
              onClick={onExploreStays}
              className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all"
            >
              Start Searching
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map((booking) => {
            const property = booking.property;
            const coverImage = property?.primary_image?.image_path ||
              (property?.images && property.images.length > 0 ? property.images[0].image_path : null);
            const imageUrl = coverImage
              ? (coverImage.startsWith('http') ? coverImage : `/storage/${coverImage}`)
              : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80';

            return (
              <div
                key={booking.id}
                onClick={() => setSelectedBooking(booking)}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col sm:flex-row cursor-pointer group"
              >
                <div className="sm:w-48 h-44 sm:h-auto relative overflow-hidden shrink-0">
                  <img
                    src={imageUrl}
                    alt={property?.title || 'Listing'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-black/70 backdrop-blur-sm text-white rounded-md">
                      {booking.booking_code}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {property?.city || 'Stay'}, {property?.country || 'Destination'}
                      </span>
                      {booking.status === 'confirmed' ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Confirmed
                        </span>
                      ) : booking.status === 'pending' ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <Clock size={10} /> Pending
                        </span>
                      ) : booking.status === 'completed' ? (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Completed
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Cancelled
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1 mt-1 group-hover:text-rose-600 transition-colors">
                      {property?.title || 'Reservation'}
                    </h3>

                    <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                      <Calendar size={13} className="text-slate-400 shrink-0" />
                      <span>{booking.check_in} — {booking.check_out}</span>
                      <span className="text-slate-300">•</span>
                      <span>{booking.nights}n</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Paid</span>
                      <span className="text-sm font-extrabold text-slate-900">
                        ${booking.total_amount} {booking.currency}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-rose-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      View Voucher <ChevronRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-9 h-9 rounded-xl text-xs font-bold ${
                currentPage === page
                  ? 'bg-rose-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Booking Voucher Modal */}
      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onBookingCancelled={handleBookingCancelled}
      />
    </div>
  );
};
