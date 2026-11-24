<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\HostController;
use App\Http\Controllers\PayoutController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\VerificationController;
use App\Http\Controllers\PropertyController;
use App\Http\Controllers\PropertyImageController;
use App\Http\Controllers\AmenityController;
use App\Http\Controllers\PropertyAvailabilityController;
use App\Http\Controllers\PropertyPricingController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\HostBookingController;
use App\Http\Controllers\CountryController;
use App\Http\Controllers\StateController;
use App\Http\Controllers\CityController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\StripeWebhookController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\FavoriteController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
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
| Public Location & Geographic Discovery Routes
|--------------------------------------------------------------------------
*/
// Hierarchical trees & autocompletes
Route::get('/locations/hierarchy', [LocationController::class, 'hierarchy']);
Route::get('/locations/search', [LocationController::class, 'search']);
Route::get('/locations/popular', [LocationController::class, 'popularDestinations']);
Route::post('/locations/validate', [LocationController::class, 'validateLocation']);

// Countries
Route::get('/countries', [CountryController::class, 'index']);
Route::get('/countries/{id}', [CountryController::class, 'show']);
Route::get('/countries/{id}/states', [StateController::class, 'byCountry']);
Route::get('/countries/{id}/cities', [CityController::class, 'byCountry']);

// States
Route::get('/states', [StateController::class, 'index']);
Route::get('/states/{id}', [StateController::class, 'show']);
Route::get('/states/{id}/cities', [CityController::class, 'byState']);

// Cities
Route::get('/cities', [CityController::class, 'index']);
Route::get('/cities/{id}', [CityController::class, 'show']);

// Public property browsing routes (Notice: /properties/map before /{slugOrId})
Route::get('/properties', [PropertyController::class, 'index']);
Route::get('/properties/map', [PropertyController::class, 'mapProperties']);
Route::get('/properties/{id}/availability', [PropertyAvailabilityController::class, 'index']);
Route::post('/properties/{id}/check-availability', [PropertyAvailabilityController::class, 'checkAvailability']);
Route::get('/properties/{id}/reviews', [ReviewController::class, 'index']);
Route::get('/properties/{slugOrId}', [PropertyController::class, 'show']);
Route::get('/amenities', [AmenityController::class, 'index']);
Route::get('/payments/config', [PaymentController::class, 'getConfig']);

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

    // 4. Guest Bookings Module
    Route::prefix('bookings')->group(function () {
        Route::get('/', [BookingController::class, 'index']);
        Route::post('/', [BookingController::class, 'store']);
        Route::get('/{id}', [BookingController::class, 'show']);
        Route::post('/{id}/cancel', [BookingController::class, 'cancel']);
        Route::post('/{id}/review', [ReviewController::class, 'store']);
    });

    // 4.2 Reviews Module
    Route::post('/reviews/{id}/host-reply', [ReviewController::class, 'hostReply']);

    // 4.3 Favorites / Wishlist Module
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites/{propertyId}/toggle', [FavoriteController::class, 'toggle']);
    Route::get('/favorites/{propertyId}/check', [FavoriteController::class, 'check']);

    // 4.4 In-App Messaging Module
    Route::get('/conversations', [MessageController::class, 'index']);
    Route::post('/conversations/start', [MessageController::class, 'start']);
    Route::get('/conversations/{id}', [MessageController::class, 'show']);
    Route::post('/conversations/{id}/messages', [MessageController::class, 'sendMessage']);
    Route::get('/messages/unread-count', [MessageController::class, 'unreadCount']);

    // 4.5 In-App Notifications Module
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);

    // 4.1 Payment Module (Stripe)
    Route::prefix('payments')->group(function () {
        Route::post('/create-intent', [PaymentController::class, 'createPaymentIntent']);
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

    // 5. Host Protected Property Management Routes
    Route::middleware('role:host')->prefix('host/properties')->group(function () {
        Route::get('/', [PropertyController::class, 'myProperties']);
        Route::post('/', [PropertyController::class, 'store']);
        Route::put('/{id}', [PropertyController::class, 'update']);
        Route::put('/{id}/status', [PropertyController::class, 'changeStatus']);
        Route::delete('/{id}', [PropertyController::class, 'destroy']);
        // Property Images Management
        Route::post('/{id}/images', [PropertyImageController::class, 'upload']);
        Route::put('/{id}/images/{imageId}/primary', [PropertyImageController::class, 'setPrimary']);
        Route::delete('/{id}/images/{imageId}', [PropertyImageController::class, 'destroy']);
        // Availability Calendar & Date Rules
        Route::get('/{id}/calendar', [PropertyAvailabilityController::class, 'calendarMatrix']);
        Route::post('/{id}/block-dates', [PropertyAvailabilityController::class, 'blockDateRange']);
        Route::put('/{id}/availability', [PropertyAvailabilityController::class, 'update']);

        // Pricing Rules & Seasonal Rates
        Route::get('/{id}/pricing', [PropertyPricingController::class, 'getPricingRules']);
        Route::put('/{id}/pricing', [PropertyPricingController::class, 'updatePricingRules']);
        Route::get('/{id}/seasonal-prices', [PropertyPricingController::class, 'getSeasonalPrices']);
        Route::post('/{id}/seasonal-prices', [PropertyPricingController::class, 'storeSeasonalPrice']);
        Route::put('/{id}/seasonal-prices/{ruleId}', [PropertyPricingController::class, 'updateSeasonalPrice']);
        Route::delete('/{id}/seasonal-prices/{ruleId}', [PropertyPricingController::class, 'destroySeasonalPrice']);
    });

    // 6. Host Reservations Management Module
    Route::middleware('role:host')->prefix('host/bookings')->group(function () {
        Route::get('/', [HostBookingController::class, 'index']);
        Route::post('/{id}/accept', [HostBookingController::class, 'accept']);
        Route::post('/{id}/reject', [HostBookingController::class, 'reject']);
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

        // Platform Bookings & Properties Oversight
        Route::get('/bookings', [AdminController::class, 'bookings']);
        Route::get('/properties', [AdminController::class, 'properties']);
        Route::put('/properties/{id}/status', [AdminController::class, 'updatePropertyStatus']);

        // Audit Logs
        Route::get('/logs', [AdminController::class, 'activityLogs']);

        // Location Management (Admin CRUD)
        Route::prefix('locations')->group(function () {
            // Countries
            Route::post('/countries', [CountryController::class, 'store']);
            Route::put('/countries/{id}', [CountryController::class, 'update']);
            Route::delete('/countries/{id}', [CountryController::class, 'destroy']);

            // States
            Route::post('/states', [StateController::class, 'store']);
            Route::put('/states/{id}', [StateController::class, 'update']);
            Route::delete('/states/{id}', [StateController::class, 'destroy']);

            // Cities
            Route::post('/cities', [CityController::class, 'store']);
            Route::put('/cities/{id}', [CityController::class, 'update']);
            Route::delete('/cities/{id}', [CityController::class, 'destroy']);
        });
    });
});

Route::post('/stripe/webhook', [
    StripeWebhookController::class,
    'handle'
]);