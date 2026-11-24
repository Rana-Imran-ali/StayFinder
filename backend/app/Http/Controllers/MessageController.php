<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    /**
     * GET /api/conversations
     * List all conversations for the authenticated user (as guest or host).
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $conversations = Conversation::with([
            'guest:id,name,email',
            'host:id,name,email',
            'property:id,title,city,country',
            'property.primaryImage',
            'latestMessage',
        ])
        ->where(function ($q) use ($userId) {
            $q->where('guest_id', $userId)
              ->orWhere('host_id', $userId);
        })
        ->orderByDesc('last_message_at')
        ->orderByDesc('updated_at')
        ->get()
        ->map(function ($convo) use ($userId) {
            $unreadCount = Message::where('conversation_id', $convo->id)
                ->where('receiver_id', $userId)
                ->where('is_read', false)
                ->count();

            $isHost = $convo->host_id === $userId;
            $otherUser = $isHost ? $convo->guest : $convo->host;

            return [
                'id' => $convo->id,
                'property' => $convo->property,
                'booking_id' => $convo->booking_id,
                'is_host' => $isHost,
                'other_user' => $otherUser,
                'latest_message' => $convo->latestMessage,
                'unread_count' => $unreadCount,
                'last_message_at' => $convo->last_message_at ?? $convo->updated_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $conversations,
        ]);
    }

    /**
     * POST /api/conversations/start
     * Start or retrieve a conversation between guest and host for a property.
     */
    public function start(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'property_id' => ['required', 'exists:properties,id'],
            'booking_id' => ['nullable', 'exists:bookings,id'],
            'message' => ['nullable', 'string', 'max:2000'],
        ]);

        $property = Property::findOrFail($validated['property_id']);

        if ($property->host_id === $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot start a conversation with yourself.',
            ], 422);
        }

        // Find or create conversation
        $conversation = Conversation::firstOrCreate(
            [
                'property_id' => $property->id,
                'guest_id' => $user->id,
                'host_id' => $property->host_id,
            ],
            [
                'booking_id' => $validated['booking_id'] ?? null,
                'last_message_at' => now(),
            ]
        );

        if (!empty($validated['booking_id']) && !$conversation->booking_id) {
            $conversation->update(['booking_id' => $validated['booking_id']]);
        }

        // If an initial message was supplied, create it
        if (!empty($validated['message'])) {
            $msg = Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $user->id,
                'receiver_id' => $property->host_id,
                'message' => $validated['message'],
                'is_read' => false,
            ]);

            $conversation->update(['last_message_at' => now()]);

            // Notify host
            AppNotification::send(
                $property->host_id,
                'new_message',
                "New message from {$user->name}",
                "{$user->name} sent you an inquiry regarding {$property->title}: \"{$validated['message']}\"",
                "/messages?conversation_id={$conversation->id}"
            );
        }

        return response()->json([
            'success' => true,
            'data' => $conversation->load([
                'guest:id,name,email',
                'host:id,name,email',
                'property:id,title,city,country',
                'property.primaryImage',
                'messages.sender:id,name',
            ]),
        ]);
    }

    /**
     * GET /api/conversations/{id}
     * Get messages for a specific conversation and mark received messages as read.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->id;

        $conversation = Conversation::with([
            'guest:id,name,email',
            'host:id,name,email',
            'property:id,title,city,country',
            'property.primaryImage',
            'messages.sender:id,name',
        ])
        ->where(function ($q) use ($userId) {
            $q->where('guest_id', $userId)
              ->orWhere('host_id', $userId);
        })
        ->findOrFail($id);

        // Mark incoming messages as read
        Message::where('conversation_id', $conversation->id)
            ->where('receiver_id', $userId)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        $isHost = $conversation->host_id === $userId;
        $otherUser = $isHost ? $conversation->guest : $conversation->host;

        return response()->json([
            'success' => true,
            'data' => [
                'conversation' => $conversation,
                'other_user' => $otherUser,
                'is_host' => $isHost,
                'messages' => $conversation->messages,
            ],
        ]);
    }

    /**
     * POST /api/conversations/{id}/messages
     * Send a new message in an existing conversation.
     */
    public function sendMessage(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $conversation = Conversation::with(['property'])
            ->where(function ($q) use ($user) {
                $q->where('guest_id', $user->id)
                  ->orWhere('host_id', $user->id);
            })
            ->findOrFail($id);

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:3000'],
        ]);

        $receiverId = $conversation->guest_id === $user->id ? $conversation->host_id : $conversation->guest_id;

        $msg = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'receiver_id' => $receiverId,
            'message' => $validated['message'],
            'is_read' => false,
        ]);

        $conversation->update(['last_message_at' => now()]);

        // Send notification
        $propTitle = $conversation->property?->title ?? 'your stay';
        AppNotification::send(
            $receiverId,
            'new_message',
            "Message from {$user->name}",
            "{$user->name}: \"{$validated['message']}\"",
            "/messages?conversation_id={$conversation->id}"
        );

        return response()->json([
            'success' => true,
            'data' => $msg->load('sender:id,name'),
        ], 201);
    }

    /**
     * GET /api/messages/unread-count
     * Quick total unread badge count for current user.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $count = Message::where('receiver_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'count' => $count,
        ]);
    }
}
