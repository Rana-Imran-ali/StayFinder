<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /**
     * Get the authenticated user's profile and roles.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['roles', 'profile']);

        return response()->json([
            'success' => true,
            'data' => $user,
        ]);
    }

    /**
     * Update user profile information.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:25'],
            'date_of_birth' => ['sometimes', 'nullable', 'date'],
            'gender' => ['sometimes', 'nullable', 'string', 'max:30'],
            'bio' => ['sometimes', 'nullable', 'string'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        // Update core user details if provided
        $userData = array_filter([
            'name' => $validated['name'] ?? null,
            'phone' => $validated['phone'] ?? null,
        ], fn($value) => !is_null($value));

        if (!empty($userData)) {
            $user->update($userData);
        }

        // Update profile details
        $profile = $user->profile ?: $user->profile()->create();
        $profile->update(array_intersect_key($validated, array_flip([
            'date_of_birth',
            'gender',
            'bio',
            'address',
        ])));

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => $user->load(['roles', 'profile']),
        ]);
    }

    /**
     * Upload or update profile photo.
     */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ]);

        $user = $request->user();
        $profile = $user->profile ?: $user->profile()->create();

        // Delete old photo if exists
        if ($profile->profile_photo && Storage::disk('public')->exists($profile->profile_photo)) {
            Storage::disk('public')->delete($profile->profile_photo);
        }

        $path = $request->file('photo')->store('profile_photos', 'public');

        $profile->update([
            'profile_photo' => $path,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile photo uploaded successfully.',
            'data' => [
                'profile_photo' => $path,
                'photo_url' => asset('storage/' . $path),
            ],
        ]);
    }
}

