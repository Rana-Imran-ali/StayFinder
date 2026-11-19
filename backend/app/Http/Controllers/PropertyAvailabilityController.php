<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Property;
use App\Models\PropertyAvailability;
use App\Models\PropertySeasonalPrice;
use App\Services\PricingCalculatorService;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PropertyAvailabilityController extends Controller
{
    public function __construct(
        private readonly PricingCalculatorService $pricingCalculator
    ) {}

    /**
     * Public endpoint: Get availability calendar list for a property.
     */
    public function index(Request $request, int $propertyId): JsonResponse
    {
        $from = $request->input('from', now()->toDateString());
        $to   = $request->input('to', now()->addMonths(6)->toDateString());

        $property = Property::findOrFail($propertyId);

        $availabilities = PropertyAvailability::where('property_id', $propertyId)
            ->whereBetween('date', [$from, $to])
            ->orderBy('date')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'property'       => $property,
                'availabilities' => $availabilities,
            ],
        ]);
    }

    /**
     * Public endpoint: Real-time price breakdown & availability verification.
     */
    public function checkAvailability(Request $request, int $propertyId): JsonResponse
    {
        $property = Property::with('seasonalPrices')->findOrFail($propertyId);

        $validated = $request->validate([
            'check_in'   => ['required', 'date', 'after_or_equal:today'],
            'check_out'  => ['required', 'date', 'after:check_in'],
            'guests'     => ['nullable', 'integer', 'min:1'],
            'has_pet'    => ['nullable', 'boolean'],
        ]);

        $guests = (int) ($validated['guests'] ?? 1);
        $hasPet = (bool) ($validated['has_pet'] ?? false);

        if ($guests > $property->max_guests) {
            return response()->json([
                'success' => false,
                'message' => "Maximum guests allowed is {$property->max_guests}.",
            ], 422);
        }

        try {
            $breakdown = $this->pricingCalculator->calculate(
                $property,
                $validated['check_in'],
                $validated['check_out'],
                $guests,
                $hasPet
            );

            return response()->json([
                'success' => true,
                'data' => [
                    'breakdown' => $breakdown,
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to calculate pricing for these dates: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Host protected: Month matrix calendar with effective nightly rates and states.
     */
    public function calendarMatrix(Request $request, int $propertyId): JsonResponse
    {
        $user = $request->user();
        $property = Property::where('host_id', $user->id)->findOrFail($propertyId);

        $year  = (int) $request->input('year', now()->year);
        $month = (int) $request->input('month', now()->month);

        $startOfMonth = Carbon::createFromDate($year, $month, 1)->startOfDay();
        $endOfMonth   = $startOfMonth->copy()->endOfMonth()->startOfDay();

        // 1. Fetch any overrides in this month
        $availMap = PropertyAvailability::where('property_id', $propertyId)
            ->whereBetween('date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
            ->get()
            ->keyBy(fn ($item) => Carbon::parse($item->date)->toDateString());

        // 2. Fetch active seasonal prices overlapping this month
        $seasonalRules = PropertySeasonalPrice::where('property_id', $propertyId)
            ->where('is_active', true)
            ->where(function ($q) use ($startOfMonth, $endOfMonth) {
                $q->whereBetween('start_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
                  ->orWhereBetween('end_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
                  ->orWhere(function ($sub) use ($startOfMonth, $endOfMonth) {
                      $sub->where('start_date', '<=', $startOfMonth->toDateString())
                          ->where('end_date', '>=', $endOfMonth->toDateString());
                  });
            })
            ->get();

        // 3. Build day matrix
        $days = [];
        $period = CarbonPeriod::create($startOfMonth, $endOfMonth);

        foreach ($period as $date) {
            $dateStr = $date->toDateString();
            $dayOfWeek = $date->dayOfWeek; // 0 = Sun, 5 = Fri, 6 = Sat
            $isWeekend = ($dayOfWeek === 5 || $dayOfWeek === 6);

            $effectivePrice = (float) $property->price_per_night;
            $priceSource    = 'base';
            $status         = 'available';
            $minNights      = $property->min_nights ?? 1;
            $note           = null;

            // Check weekend default
            if ($isWeekend && $property->weekend_price !== null && $property->weekend_price > 0) {
                $effectivePrice = (float) $property->weekend_price;
                $priceSource    = 'weekend';
            }

            // Check seasonal rule
            foreach ($seasonalRules as $rule) {
                $ruleStart = Carbon::parse($rule->start_date)->startOfDay();
                $ruleEnd   = Carbon::parse($rule->end_date)->startOfDay();
                if ($date->gte($ruleStart) && $date->lte($ruleEnd)) {
                    if ($isWeekend && $rule->weekend_price !== null && $rule->weekend_price > 0) {
                        $effectivePrice = (float) $rule->weekend_price;
                    } else {
                        $effectivePrice = (float) $rule->price_per_night;
                    }
                    $priceSource = 'seasonal';
                    if ($rule->min_nights) {
                        $minNights = (int) $rule->min_nights;
                    }
                    break;
                }
            }

            // Check manual availability override
            if (isset($availMap[$dateStr])) {
                $override = $availMap[$dateStr];

                if (!$override->is_available || $override->status === 'blocked') {
                    $status = 'blocked';
                } elseif ($override->status === 'booked') {
                    $status = 'booked';
                }

                if ($override->custom_price !== null && $override->custom_price > 0) {
                    $effectivePrice = (float) $override->custom_price;
                    $priceSource    = 'custom';
                }

                if ($override->min_nights) {
                    $minNights = (int) $override->min_nights;
                }

                $note = $override->note;
            }

            $days[] = [
                'date'            => $dateStr,
                'day'             => $date->day,
                'day_of_week'     => $date->format('D'),
                'is_weekend'      => $isWeekend,
                'status'          => $status,
                'price'           => $effectivePrice,
                'price_source'    => $priceSource,
                'min_nights'      => $minNights,
                'note'            => $note,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'property_id'   => $property->id,
                'year'          => $year,
                'month'         => $month,
                'base_price'    => (float) $property->price_per_night,
                'weekend_price' => $property->weekend_price ? (float) $property->weekend_price : null,
                'days'          => $days,
            ],
        ]);
    }

    /**
     * Host protected: Block a range of dates with optional reason.
     */
    public function blockDateRange(Request $request, int $propertyId): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($propertyId);

        $validated = $request->validate([
            'start_date' => ['required', 'date', 'after_or_equal:today'],
            'end_date'   => ['required', 'date', 'after_or_equal:start_date'],
            'reason'     => ['nullable', 'string', 'max:255'],
        ]);

        $period = CarbonPeriod::create($validated['start_date'], $validated['end_date']);

        foreach ($period as $date) {
            PropertyAvailability::updateOrCreate(
                [
                    'property_id' => $property->id,
                    'date'        => $date->toDateString(),
                ],
                [
                    'is_available' => false,
                    'status'       => 'blocked',
                    'note'         => $validated['reason'] ?? 'Blocked by host',
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Dates successfully blocked.',
        ]);
    }

    /**
     * Host protected: Block / unblock dates or set custom prices.
     */
    public function update(Request $request, int $propertyId): JsonResponse
    {
        $property = Property::where('host_id', $request->user()->id)->findOrFail($propertyId);

        $validated = $request->validate([
            'dates'        => ['required', 'array', 'min:1'],
            'dates.*'      => ['date'],
            'is_available' => ['required', 'boolean'],
            'status'       => ['nullable', 'string', 'in:available,blocked,booked'],
            'custom_price' => ['nullable', 'numeric', 'min:0'],
            'min_nights'   => ['nullable', 'integer', 'min:1'],
            'note'         => ['nullable', 'string', 'max:100'],
        ]);

        $status = $validated['status'] ?? ($validated['is_available'] ? 'available' : 'blocked');

        foreach ($validated['dates'] as $date) {
            PropertyAvailability::updateOrCreate(
                [
                    'property_id' => $property->id,
                    'date'        => $date,
                ],
                [
                    'is_available' => $validated['is_available'],
                    'status'       => $status,
                    'custom_price' => $validated['custom_price'] ?? null,
                    'min_nights'   => $validated['min_nights'] ?? null,
                    'note'         => $validated['note'] ?? null,
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Calendar availability updated successfully.',
        ]);
    }
}
