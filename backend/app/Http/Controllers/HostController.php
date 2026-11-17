<?php

namespace App\Http\Controllers;

use App\Models\HostProfile;
use App\Models\HostVerification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HostController extends Controller
{
    /**
     * Complete host onboarding and registration.
     */
    public function onboard(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'business_name' => ['nullable', 'string', 'max:255'],
            'tax_id' => ['nullable', 'string', 'max:100'],
            'about_host' => ['required', 'string'],
            'response_time' => ['nullable', 'string', 'max:50'],
            'languages' => ['nullable', 'array'],
            'cancellation_policy' => ['nullable', 'string', 'in:flexible,moderate,strict'],
            'check_in_time' => ['nullable', 'string', 'max:20'],
            'check_out_time' => ['nullable', 'string', 'max:20'],
            'instant_booking' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();

        // Assign host role if not already assigned
        $user->assignRole('host');

        // Create or update Host Profile
        $hostProfile = HostProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'business_name' => $validated['business_name'] ?? null,
                'tax_id' => $validated['tax_id'] ?? null,
                'about_host' => $validated['about_host'],
                'response_time' => $validated['response_time'] ?? 'within a few hours',
                'languages' => $validated['languages'] ?? ['English'],
                'cancellation_policy' => $validated['cancellation_policy'] ?? 'flexible',
                'check_in_time' => $validated['check_in_time'] ?? '15:00',
                'check_out_time' => $validated['check_out_time'] ?? '11:00',
                'instant_booking' => $validated['instant_booking'] ?? true,
            ]
        );

        // Create pending host verification request
        HostVerification::updateOrCreate(
            ['user_id' => $user->id],
            [
                'status' => 'pending',
                'notes' => 'Host onboarding completed. Pending review.',
                'rejection_reason' => null,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Host onboarding submitted successfully! Your host application is now pending verification.',
            'data' => [
                'user' => $user->load(['roles', 'hostProfile', 'hostVerification']),
            ],
        ], 201);
    }

    /**
     * Get host public/private profile.
     */
    public function getProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $hostProfile = $user->hostProfile;

        if (!$hostProfile) {
            return response()->json([
                'success' => false,
                'message' => 'No host profile found for this account. Please complete onboarding first.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'host_profile' => $hostProfile,
                'is_host_verified' => (bool)$user->is_host_verified,
                'is_identity_verified' => (bool)$user->is_identity_verified,
                'verification' => $user->hostVerification,
            ],
        ]);
    }

    /**
     * Update host profile information (about, business name, languages, response time).
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'business_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'about_host' => ['sometimes', 'required', 'string'],
            'response_time' => ['sometimes', 'nullable', 'string', 'max:50'],
            'languages' => ['sometimes', 'nullable', 'array'],
        ]);

        $user = $request->user();
        $hostProfile = $user->hostProfile ?: HostProfile::create(['user_id' => $user->id]);

        $hostProfile->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Host profile updated successfully.',
            'data' => $hostProfile,
        ]);
    }

    /**
     * Get host account & policy settings.
     */
    public function getAccountSettings(Request $request): JsonResponse
    {
        $hostProfile = $request->user()->hostProfile;

        if (!$hostProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Host profile not initialized.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'tax_id' => $hostProfile->tax_id,
                'cancellation_policy' => $hostProfile->cancellation_policy,
                'check_in_time' => $hostProfile->check_in_time,
                'check_out_time' => $hostProfile->check_out_time,
                'instant_booking' => $hostProfile->instant_booking,
            ],
        ]);
    }

    /**
     * Update host account & policy settings.
     */
    public function updateAccountSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tax_id' => ['sometimes', 'nullable', 'string', 'max:100'],
            'cancellation_policy' => ['sometimes', 'required', 'string', 'in:flexible,moderate,strict'],
            'check_in_time' => ['sometimes', 'required', 'string', 'max:20'],
            'check_out_time' => ['sometimes', 'required', 'string', 'max:20'],
            'instant_booking' => ['sometimes', 'required', 'boolean'],
        ]);

        $user = $request->user();
        $hostProfile = $user->hostProfile ?: HostProfile::create(['user_id' => $user->id]);

        $hostProfile->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Host account settings updated successfully.',
            'data' => $hostProfile,
        ]);
    }

    /**
     * Submit or re-submit host verification request.
     */
    public function requestVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        // Require identity verification first
        if (!$user->is_identity_verified) {
            return response()->json([
                'success' => false,
                'message' => 'Government identity verification must be approved before requesting host verification.',
            ], 422);
        }

        $verification = HostVerification::updateOrCreate(
            ['user_id' => $user->id],
            [
                'status' => 'pending',
                'notes' => $request->input('notes', 'Host verification requested.'),
                'rejection_reason' => null,
                'verified_at' => null,
                'verified_by' => null,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Host verification request submitted to platform administrators.',
            'data' => $verification,
        ]);
    }
}
