<?php

namespace App\Http\Controllers\Api\V1\Booking;

use App\Enums\TransactionSource;
use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\SimulateBookingPaymentRequest;
use App\Http\Requests\Booking\StoreBookingRequest;
use App\Http\Resources\BookingResource;
use App\Http\Resources\BookingSummaryResource;
use App\Models\Transaction;
use App\Services\BookingTransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Online bookings.
 *
 * Every endpoint sits behind `auth:sanctum` + `role:visitor,admin`, and is
 * additionally authorized against TransactionPolicy: a visitor only ever
 * touches their own booking, staff are denied, and the payment simulation is
 * owner-only. Hiding buttons in the UI is not a control.
 */
class TransactionController extends Controller
{
    /**
     * Newest bookings shown in the history list. Prototype cap; no pagination.
     */
    private const LIST_LIMIT = 50;

    /**
     * Relations required to render a booking detail. Visitor `nik` is selected
     * so the resource can mask it; it is never returned raw.
     */
    private const DETAIL_RELATIONS = [
        'user:id,name',
        'visitors:id,transaction_id,full_name,nik',
        'transactionVehicles.vehicleType:id,code,name',
        'payment.receivedBy:id,name',
        'tickets:id,transaction_id,visitor_id,ticket_code,status,printed_at',
    ];

    /**
     * A visitor sees only their own bookings; an admin sees every online
     * booking administratively. Staff without those roles never reach here.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Transaction::query()
            ->where('source', TransactionSource::Online)
            ->with('payment:id,transaction_id,status');

        if (! $user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        $bookings = $query
            ->latest('id')
            ->limit(self::LIST_LIMIT)
            ->get();

        return response()->json([
            'data' => BookingSummaryResource::collection($bookings),
        ]);
    }

    public function store(
        StoreBookingRequest $request,
        BookingTransactionService $service,
    ): JsonResponse {
        $this->authorize('createBooking', Transaction::class);

        $transaction = $service->create($request->user(), $request->validated());

        return response()->json([
            'message' => 'Booking berhasil dibuat.',
            'data' => new BookingResource($this->detail($transaction)),
        ], 201);
    }

    public function show(Transaction $transaction): JsonResponse
    {
        $this->authorize('viewBooking', $transaction);

        return response()->json([
            'data' => new BookingResource($this->detail($transaction)),
        ]);
    }

    public function simulatePayment(
        SimulateBookingPaymentRequest $request,
        Transaction $transaction,
        BookingTransactionService $service,
    ): JsonResponse {
        $this->authorize('simulateBookingPayment', $transaction);

        $transaction = $service->simulatePayment(
            $request->user(),
            $transaction,
            (string) $request->validated('reference'),
            $request->outcome(),
        );

        return response()->json([
            'message' => 'Simulasi pembayaran diproses.',
            'data' => new BookingResource($this->detail($transaction)),
        ]);
    }

    public function printTickets(
        Request $request,
        Transaction $transaction,
        BookingTransactionService $service,
    ): JsonResponse {
        $this->authorize('printBookingTickets', $transaction);

        $service->printTickets($request->user(), $transaction);

        return response()->json([
            'message' => 'Pencetakan tiket dicatat.',
            'data' => new BookingResource($this->detail($transaction->refresh())),
        ]);
    }

    private function detail(Transaction $transaction): Transaction
    {
        return $transaction->load(self::DETAIL_RELATIONS);
    }
}
