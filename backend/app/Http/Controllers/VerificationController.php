<?php

namespace App\Http\Controllers;

use App\Models\IdentityVerification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VerificationController extends Controller
{
    /**
     * Submit government ID documents and selfie for identity verification.
     */
    public function submitIdentity(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'document_type' => ['required', 'string', 'in:passport,national_id,driving_license'],
            'document_number' => ['nullable', 'string', 'max:100'],
            'document_front' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'document_back' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'selfie' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
        ]);

        $user = $request->user();

        // Remove old files if a previous request existed
        $existing = $user->identityVerification;
        if ($existing) {
            foreach (['document_front', 'document_back', 'selfie'] as $field) {
                if ($existing->$field && Storage::disk('public')->exists($existing->$field)) {
                    Storage::disk('public')->delete($existing->$field);
                }
            }
        }

        // Store uploaded documents securely
        $frontPath = $request->file('document_front')->store('identity_documents', 'public');
        $backPath = $request->hasFile('document_back')
            ? $request->file('document_back')->store('identity_documents', 'public')
            : null;
        $selfiePath = $request->file('selfie')->store('identity_documents', 'public');

        $verification = IdentityVerification::updateOrCreate(
            ['user_id' => $user->id],
            [
                'document_type' => $validated['document_type'],
                'document_number' => $validated['document_number'] ?? null,
                'document_front' => $frontPath,
                'document_back' => $backPath,
                'selfie' => $selfiePath,
                'status' => 'pending',
                'rejection_reason' => null,
                'verified_at' => null,
                'verified_by' => null,
            ]
        );

        $user->update(['is_identity_verified' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Identity verification documents submitted successfully. An administrator will review your application.',
            'data' => $verification,
        ], 201);
    }

    /**
     * Get identity verification status for the authenticated user.
     */
    public function status(Request $request): JsonResponse
    {
        $verification = $request->user()->identityVerification;

        return response()->json([
            'success' => true,
            'data' => [
                'is_identity_verified' => (bool)$request->user()->is_identity_verified,
                'verification' => $verification,
            ],
        ]);
    }
}
