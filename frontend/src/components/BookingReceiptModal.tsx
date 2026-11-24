import React from 'react';
import type { Booking } from '../types/booking';
import { X, Printer, ShieldCheck, MapPin, Calendar, Users, DollarSign } from 'lucide-react';

interface BookingReceiptModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BookingReceiptModal: React.FC<BookingReceiptModalProps> = ({
  booking,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !booking) return null;

  const property = booking.property;

  const formatCurrency = (amount: number | string, currency = 'USD') => {
    const num = Number(amount) || 0;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(num);
    } catch {
      return `${currency || '$'} ${num.toFixed(2)}`;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none">
        {/* Header - Screen only */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between print:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Booking Voucher & Tax Receipt
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Printer size={14} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-8 overflow-y-auto space-y-6 print:p-8 print:overflow-visible">
          {/* Logo & Status Row */}
          <div className="flex items-start justify-between border-b pb-6 border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-rose-600">StayFinder</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                  Official Receipt
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Issued on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">
                Booking Reference
              </span>
              <span className="text-base font-mono font-black text-slate-900">
                {booking.booking_code}
              </span>
              <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck size={12} /> Payment Confirmed
              </div>
            </div>
          </div>

          {/* Property Info */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Accommodation Details
            </span>
            <h2 className="text-lg font-black text-slate-900">{property?.title || 'Vacation Rental'}</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
              <MapPin size={13} className="text-rose-500 shrink-0" />
              <span>{property?.address ? `${property.address}, ` : ''}{property?.city}, {property?.country}</span>
            </div>
          </div>

          {/* Schedule & Stay Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Check-in</span>
              <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" />
                {booking.check_in}
              </div>
              <span className="text-[10px] text-slate-400">After 3:00 PM</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Check-out</span>
              <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" />
                {booking.check_out}
              </div>
              <span className="text-[10px] text-slate-400">Before 11:00 AM</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Duration</span>
              <div className="font-bold text-slate-800 mt-0.5">
                {booking.nights} Night{booking.nights !== 1 ? 's' : ''}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Guests</span>
              <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                <Users size={12} className="text-slate-400" />
                {booking.guests_count} Guest{booking.guests_count !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Guest & Host Information */}
          <div className="grid grid-cols-2 gap-4 text-xs border-y py-4 border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Primary Guest
              </span>
              <p className="font-bold text-slate-900">{booking.guest?.name || 'Valued Guest'}</p>
              <p className="text-slate-500 text-[11px]">{booking.guest?.email}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                Hosted By
              </span>
              <p className="font-bold text-slate-900">{booking.host?.name || 'Verified Host'}</p>
              <p className="text-slate-500 text-[11px]">{booking.host?.email}</p>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Payment Breakdown
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-700">
                <span>Accommodation ({booking.nights} night{booking.nights !== 1 ? 's' : ''})</span>
                <span className="font-semibold">{formatCurrency(booking.base_price, booking.currency)}</span>
              </div>

              {Number(booking.cleaning_fee) > 0 && (
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Cleaning Fee</span>
                  <span className="font-semibold">{formatCurrency(booking.cleaning_fee, booking.currency)}</span>
                </div>
              )}

              {Number(booking.pet_fee) > 0 && (
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Pet Accommodation Fee</span>
                  <span className="font-semibold">{formatCurrency(booking.pet_fee, booking.currency)}</span>
                </div>
              )}

              {Number(booking.tax_amount) > 0 && (
                <div className="flex justify-between py-1 text-slate-700">
                  <span>Occupancy Taxes & Service Fees</span>
                  <span className="font-semibold">{formatCurrency(booking.tax_amount, booking.currency)}</span>
                </div>
              )}

              {Number(booking.discount_amount) > 0 && (
                <div className="flex justify-between py-1 text-emerald-600 font-semibold">
                  <span>Promotional Discount</span>
                  <span>-{formatCurrency(booking.discount_amount, booking.currency)}</span>
                </div>
              )}

              <div className="flex justify-between pt-3 border-t-2 border-slate-900 text-sm font-black text-slate-900">
                <span>Total Paid</span>
                <span>{formatCurrency(booking.total_amount, booking.currency)}</span>
              </div>
            </div>
          </div>

          {/* Verification Footnote */}
          <div className="bg-slate-50 p-4 rounded-xl text-[11px] text-slate-500 border border-slate-100 flex items-start gap-2">
            <DollarSign size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-700">Proof of Payment</p>
              <p>
                Payment was processed via StayFinder Secure Transactions. For inquiries or customer support, please present reference code <strong>{booking.booking_code}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
