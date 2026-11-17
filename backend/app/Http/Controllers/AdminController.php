<?php

namespace App\Http\Controllers;

use App\Models\AdminActivityLog;
use App\Models\HostProfile;
use App\Models\HostVerification;
use App\Models\IdentityVerification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Dashboard overview statistics.
     */
    public function dashboard(Request $request): JsonResponse
    {
        $stats = [
            'total_users' => User::count(),
            'total_hosts' => User::whereHas('roles', fn($q) => $q->where('slug', 'host'))->count(),
            'active_users' => User::where('status', 'active')->count(),
            'banned_users' => User::where('status', 'banned')->count(),
            'pending_identity_verifications' => IdentityVerification::where('status', 'pending')->count(),
            'pending_host_verifications' => HostVerification::where('status', 'pending')->count(),
        ];

        $recentLogs = AdminActivityLog::with('admin:id,name,email')
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => $stats,
                'recent_logs' => $recentLogs,
            ],
        ]);
    }

    /**
     * Searchable and filterable users list.
     */
    public function users(Request $request): JsonResponse
    {
        $query = User::with(['roles', 'profile', 'hostProfile', 'identityVerification', 'hostVerification']);

        // Search by keyword
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Filter by role
        if ($role = $request->input('role')) {
            $query->whereHas('roles', fn($q) => $q->where('slug', $role));
        }

        // Filter by account status
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $users = $query->latest()->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $users,
        ]);
    }

    /**
     * Change user status (active, inactive, banned).
     */
    public function updateUserStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:active,inactive,banned'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $user = User::findOrFail($id);
        $oldStatus = $user->status;
        $user->update(['status' => $validated['status']]);

        // If banned, revoke all tokens
        if ($validated['status'] === 'banned') {
            $user->tokens()->delete();
        }

        AdminActivityLog::log(
            adminId: $request->user()->id,
            action: 'update_user_status',
            targetType: 'User',
            targetId: $user->id,
            description: "Changed status of {$user->email} from {$oldStatus} to {$validated['status']}. " . ($validated['reason'] ?? ''),
            ip: $request->ip()
        );

        return response()->json([
            'success' => true,
            'message' => "User status updated to {$validated['status']}.",
            'data' => $user,
        ]);
    }

    /**
     * List identity verifications pending review.
     */
    public function pendingIdentityVerifications(Request $request): JsonResponse
    {
        $status = $request->input('status', 'pending');

        $verifications = IdentityVerification::with('user:id,name,email,phone')
            ->when($status !== 'all', fn($q) => $q->where('status', $status))
            ->latest()
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $verifications,
        ]);
    }

    /**
     * Review identity verification (Approve or Reject).
     */
    public function reviewIdentityVerification(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'decision' => ['required', 'string', 'in:approved,rejected'],
            'rejection_reason' => ['required_if:decision,rejected', 'nullable', 'string'],
        ]);

        $verification = IdentityVerification::findOrFail($id);
        $isApproved = $validated['decision'] === 'approved';

        $verification->update([
            'status' => $validated['decision'],
            'rejection_reason' => $isApproved ? null : $validated['rejection_reason'],
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
        ]);

        $verification->user->update([
            'is_identity_verified' => $isApproved,
        ]);

        AdminActivityLog::log(
            adminId: $request->user()->id,
            action: $isApproved ? 'approve_identity' : 'reject_identity',
            targetType: 'IdentityVerification',
            targetId: $verification->id,
            description: ($isApproved ? "Approved" : "Rejected") . " identity verification for {$verification->user->email}. " . ($validated['rejection_reason'] ?? ''),
            ip: $request->ip()
        );

        return response()->json([
            'success' => true,
            'message' => "Identity verification has been {$validated['decision']}.",
            'data' => $verification->load('user'),
        ]);
    }

    /**
     * List host applications pending review.
     */
    public function pendingHostVerifications(Request $request): JsonResponse
    {
        $status = $request->input('status', 'pending');

        $hosts = HostVerification::with(['user.profile', 'user.hostProfile', 'user.identityVerification'])
            ->when($status !== 'all', fn($q) => $q->where('status', $status))
            ->latest()
            ->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $hosts,
        ]);
    }

    /**
     * Review host verification (Approve or Reject).
     */
    public function reviewHostVerification(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'decision' => ['required', 'string', 'in:approved,rejected'],
            'rejection_reason' => ['required_if:decision,rejected', 'nullable', 'string'],
        ]);

        $verification = HostVerification::findOrFail($id);
        $isApproved = $validated['decision'] === 'approved';

        $verification->update([
            'status' => $validated['decision'],
            'rejection_reason' => $isApproved ? null : $validated['rejection_reason'],
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
        ]);

        $verification->user->update([
            'is_host_verified' => $isApproved,
        ]);

        AdminActivityLog::log(
            adminId: $request->user()->id,
            action: $isApproved ? 'approve_host' : 'reject_host',
            targetType: 'HostVerification',
            targetId: $verification->id,
            description: ($isApproved ? "Approved" : "Rejected") . " host verification for {$verification->user->email}. " . ($validated['rejection_reason'] ?? ''),
            ip: $request->ip()
        );

        return response()->json([
            'success' => true,
            'message' => "Host verification has been {$validated['decision']}.",
            'data' => $verification->load('user'),
        ]);
    }

    /**
     * View admin audit logs.
     */
    public function activityLogs(Request $request): JsonResponse
    {
        $logs = AdminActivityLog::with('admin:id,name,email')
            ->latest()
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }
}
