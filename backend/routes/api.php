<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\HostController;
use App\Http\Controllers\PayoutController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\VerificationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Authentication Routes
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

/*
|--------------------------------------------------------------------------
| Protected Routes (Sanctum Authenticated)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // 1. Current User & Session Control
    Route::get('/user', function (Request $request) {
        return response()->json([
            'success' => true,
            'data' => $request->user()->load([
                'roles',
                'profile',
                'hostProfile',
                'identityVerification',
                'hostVerification',
            ]),
        ]);
    });

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/logout-all', [AuthController::class, 'logoutAll']);
    Route::put('/user/password', [AuthController::class, 'changePassword']);

    // 2. User Profile Management
    Route::prefix('user/profile')->group(function () {
        Route::get('/', [ProfileController::class, 'show']);
        Route::put('/', [ProfileController::class, 'update']);
        Route::post('/photo', [ProfileController::class, 'uploadPhoto']);
    });

    // 3. Identity Verification Module
    Route::prefix('verification/identity')->group(function () {
        Route::get('/status', [VerificationController::class, 'status']);
        Route::post('/', [VerificationController::class, 'submitIdentity']);
    });

    // 4. Host Management Module
    Route::prefix('host')->group(function () {
        // Host Registration & Onboarding
        Route::post('/onboard', [HostController::class, 'onboard']);

        // Host Profile Management
        Route::get('/profile', [HostController::class, 'getProfile']);
        Route::put('/profile', [HostController::class, 'updateProfile']);

        // Host Account & Policy Management
        Route::get('/account', [HostController::class, 'getAccountSettings']);
        Route::put('/account', [HostController::class, 'updateAccountSettings']);

        // Host Verification Request
        Route::post('/verification/request', [HostController::class, 'requestVerification']);

        // 5. Payout Account Management
        Route::prefix('payout-methods')->group(function () {
            Route::get('/', [PayoutController::class, 'index']);
            Route::post('/', [PayoutController::class, 'store']);
            Route::put('/{id}/default', [PayoutController::class, 'setDefault']);
            Route::delete('/{id}', [PayoutController::class, 'destroy']);
        });

        // Host Portal Dashboard
        Route::middleware('role:host')->get('/dashboard', function () {
            return response()->json([
                'success' => true,
                'message' => 'Welcome to the Host Portal',
            ]);
        });
    });

    // 6. Admin Management Module (Protected by role:admin)
    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard']);

        // User Management
        Route::get('/users', [AdminController::class, 'users']);
        Route::put('/users/{id}/status', [AdminController::class, 'updateUserStatus']);

        // Identity Verification Review
        Route::get('/verifications/identity', [AdminController::class, 'pendingIdentityVerifications']);
        Route::post('/verifications/identity/{id}/review', [AdminController::class, 'reviewIdentityVerification']);

        // Host Verification Review
        Route::get('/verifications/hosts', [AdminController::class, 'pendingHostVerifications']);
        Route::post('/verifications/hosts/{id}/review', [AdminController::class, 'reviewHostVerification']);

        // Audit Logs
        Route::get('/logs', [AdminController::class, 'activityLogs']);
    });
});
