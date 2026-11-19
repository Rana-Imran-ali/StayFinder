<?php

namespace App\Services;

use App\Models\Property;
use App\Models\PropertyAvailability;
use App\Models\PropertySeasonalPrice;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PricingCalculatorService
{
    /**
     * Calculate the full price breakdown for a stay.
     *
     * @param  Property $property
     * @param  string   $checkIn   Y-m-d
     * @param  string   $checkOut  Y-m-d  (guests check OUT this day, not charged for it)
     * @param  int      $guests
     * @param  bool     $hasPet
     * @return array
     *
     * @throws \InvalidArgumentException
     */
    public function calculate(
        Property $property,
        string   $checkIn,
        string   $checkOut,
        int      $guests    = 1,
        bool     $hasPet    = false
    ): array {
        // ── Dates ────────────────────────────────────────────────
        $start = Carbon::parse($checkIn)->startOfDay();
        $end   = Carbon::parse($checkOut)->startOfDay();

        if ($end->lte($start)) {
            throw new \InvalidArgumentException('Check-out must be after check-in.');
        }

        $nights = (int) $start->diffInDays($end);

        // ── Stay-rule validation ──────────────────────────────────
        $minNights = $property->min_nights ?? 1;
        $maxNights = $property->max_nights ?? 365;

        if ($nights < $minNights) {
            throw new \InvalidArgumentException(
                "Minimum stay is {$minNights} night(s)."
            );
        }
        if ($nights > $maxNights) {
            throw new \InvalidArgumentException(
                "Maximum stay is {$maxNights} night(s)."
            );
        }

        // ── Pre-load availability overrides for this range ───────
        $rangeEndMinusOne = $end->copy()->subDay()->toDateString();
        $availMap = PropertyAvailability::where('property_id', $property->id)
            ->whereBetween('date', [$start->toDateString(), $rangeEndMinusOne])
            ->get()
            ->keyBy(fn ($a) => is_string($a->date) ? substr($a->date, 0, 10) : $a->date->toDateString());

        // ── Pre-load seasonal prices ──────────────────────────────
        $seasonalRules = PropertySeasonalPrice::where('property_id', $property->id)
            ->where('is_active', true)
            ->where('start_date', '<=', $end->toDateString())
            ->where('end_date',   '>=', $start->toDateString())
            ->get();

        // ── Per-night loop ────────────────────────────────────────
        $nightlyBreakdown = [];
        $baseTotal        = 0.0;
        $isAvailable      = true;
        $unavailableDates = [];

        $current = $start->copy();

        while ($current->lt($end)) {
            $dateStr  = $current->toDateString();
            $avail    = $availMap->get($dateStr);

            // availability check
            if ($avail && ! $avail->is_available) {
                $isAvailable      = false;
                $unavailableDates[] = $dateStr;
                $current->addDay();
                continue;
            }

            // price hierarchy: custom date > seasonal rule > weekend/base
            if ($avail && $avail->custom_price !== null) {
                $nightRate = (float) $avail->custom_price;
                $source    = 'custom';
            } else {
                $seasonal = $this->matchSeasonalRule($seasonalRules, $dateStr);
                if ($seasonal) {
                    $isWeekend = in_array($current->dayOfWeek, [Carbon::FRIDAY, Carbon::SATURDAY]);
                    $nightRate = ($isWeekend && $seasonal->weekend_price)
                        ? (float) $seasonal->weekend_price
                        : (float) $seasonal->price_per_night;
                    $source = 'seasonal:' . $seasonal->name;
                } else {
                    $isWeekend = in_array($current->dayOfWeek, [Carbon::FRIDAY, Carbon::SATURDAY]);
                    $nightRate = ($isWeekend && $property->weekend_price)
                        ? (float) $property->weekend_price
                        : (float) $property->price_per_night;
                    $source = $isWeekend && $property->weekend_price ? 'weekend' : 'base';
                }
            }

            $nightlyBreakdown[] = [
                'date'   => $dateStr,
                'price'  => $nightRate,
                'source' => $source,
            ];
            $baseTotal += $nightRate;
            $current->addDay();
        }

        if (! $isAvailable) {
            return [
                'available'        => false,
                'unavailable_dates'=> $unavailableDates,
            ];
        }

        // ── Extra guest fee ───────────────────────────────────────
        $extraGuestFee    = 0.0;
        $threshold        = $property->extra_guest_threshold ?? 0;
        $extraGuestCharge = $property->extra_guest_fee ?? 0.0;

        if ($threshold > 0 && $guests > $threshold && $extraGuestCharge > 0) {
            $extraGuests    = $guests - $threshold;
            $extraGuestFee  = $extraGuests * $extraGuestCharge * $nights;
        }

        // ── Pet fee ───────────────────────────────────────────────
        $petFee = $hasPet ? (float) ($property->pet_fee ?? 0) : 0.0;

        // ── Cleaning fee ──────────────────────────────────────────
        $cleaningFee = (float) ($property->cleaning_fee ?? 0);

        // ── Subtotal before discounts ─────────────────────────────
        $subtotal = $baseTotal + $extraGuestFee + $petFee + $cleaningFee;

        // ── Discounts ─────────────────────────────────────────────
        $discountAmount = 0.0;
        $discountLabel  = null;

        $weeklyPct  = (float) ($property->weekly_discount_percent  ?? 0);
        $monthlyPct = (float) ($property->monthly_discount_percent ?? 0);

        if ($nights >= 28 && $monthlyPct > 0) {
            $discountAmount = round($baseTotal * ($monthlyPct / 100), 2);
            $discountLabel  = "{$monthlyPct}% monthly discount";
        } elseif ($nights >= 7 && $weeklyPct > 0) {
            $discountAmount = round($baseTotal * ($weeklyPct / 100), 2);
            $discountLabel  = "{$weeklyPct}% weekly discount";
        }

        $afterDiscount = $subtotal - $discountAmount;

        // ── Tax ────────────────────────────────────────────────────
        $taxPct    = (float) ($property->tax_percent ?? 0);
        $taxAmount = $taxPct > 0 ? round($afterDiscount * ($taxPct / 100), 2) : 0.0;

        // ── Security deposit (refundable) ─────────────────────────
        $securityDeposit = (float) ($property->security_deposit ?? 0);

        // ── Total ──────────────────────────────────────────────────
        $total = round($afterDiscount + $taxAmount, 2);

        return [
            'available'          => true,
            'nights'             => $nights,
            'nightly_breakdown'  => $nightlyBreakdown,
            'base_total'         => round($baseTotal, 2),
            'extra_guest_fee'    => round($extraGuestFee, 2),
            'pet_fee'            => round($petFee, 2),
            'cleaning_fee'       => round($cleaningFee, 2),
            'subtotal'           => round($subtotal, 2),
            'discount_label'     => $discountLabel,
            'discount_amount'    => round($discountAmount, 2),
            'tax_percent'        => $taxPct,
            'tax_amount'         => $taxAmount,
            'security_deposit'   => round($securityDeposit, 2),
            'total'              => $total,
            'currency'           => $property->currency ?? 'USD',
        ];
    }

    /**
     * Find the first active seasonal rule that covers $dateStr.
     */
    private function matchSeasonalRule(
        Collection $rules,
        string     $dateStr
    ): ?PropertySeasonalPrice {
        return $rules->first(function (PropertySeasonalPrice $rule) use ($dateStr) {
            $startStr = is_string($rule->start_date) ? substr($rule->start_date, 0, 10) : $rule->start_date->toDateString();
            $endStr   = is_string($rule->end_date) ? substr($rule->end_date, 0, 10) : $rule->end_date->toDateString();
            return $startStr <= $dateStr && $endStr >= $dateStr;
        });
    }
}

