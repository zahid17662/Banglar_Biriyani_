type Props = {
  order: any
  onClose: () => void
  onViewOrders: () => void
}

export function OrderConfirmationModal({ order, onClose, onViewOrders }: Props) {
  if (!order) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-card bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Banner */}
        <div className="bg-brand p-6 text-center text-white relative">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-white/20 text-white border border-white/30">
            <svg
              className="size-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-display text-2xl">Order Confirmed!</h2>
          <p className="text-xs text-white/80 mt-1">
            Persisted in Neon PostgreSQL database inside a single transaction
          </p>
          <div className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 font-mono text-sm font-bold tracking-wider">
            {order.orderNumber}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Order Details */}
          <div className="rounded-lg border border-line bg-alabaster p-3.5 space-y-2">
            <div className="flex justify-between border-b border-line/60 pb-2">
              <span className="text-slate">Scheduled Delivery:</span>
              <span className="font-bold text-charcoal">
                {order.scheduledDay} ({order.deliverySlot})
              </span>
            </div>
            <div className="flex justify-between border-b border-line/60 pb-2">
              <span className="text-slate">Customer Name:</span>
              <span className="font-medium text-charcoal">{order.customerName}</span>
            </div>
            <div className="flex justify-between border-b border-line/60 pb-2">
              <span className="text-slate">Contact Phone:</span>
              <span className="font-mono text-charcoal">{order.customerPhone}</span>
            </div>
            <div className="flex justify-between border-b border-line/60 pb-2">
              <span className="text-slate">Address:</span>
              <span className="font-medium text-charcoal text-right max-w-xs">
                {order.customerAddress}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">Payment Mode:</span>
              <span className="font-bold text-brand">{order.paymentMethod}</span>
            </div>
          </div>

          {/* Itemized list */}
          <div>
            <h4 className="text-display text-xs tracking-wider text-charcoal mb-2">
              Ordered Items
            </h4>
            <div className="rounded-lg border border-line divide-y divide-line">
              {order.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-2.5">
                  <div>
                    <span className="font-semibold text-charcoal">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="block text-[10px] text-slate font-mono">
                      ৳{item.price} each
                    </span>
                  </div>
                  <span className="font-bold text-charcoal">
                    ৳{item.subtotal || item.price * item.quantity}
                  </span>
                </div>
              ))}
              <div className="p-2.5 bg-alabaster space-y-1">
                <div className="flex justify-between text-slate">
                  <span>Subtotal</span>
                  <span>৳{order.subtotal}</span>
                </div>
                <div className="flex justify-between text-slate">
                  <span>Delivery Fee</span>
                  <span>৳{order.deliveryFee}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-charcoal pt-1 border-t border-line/60">
                  <span>Total Paid/Due</span>
                  <span className="text-brand">৳{order.totalAmount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-line bg-white p-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-line py-2.5 text-sm font-semibold text-charcoal hover:bg-alabaster transition"
          >
            Done
          </button>
          <button
            type="button"
            onClick={onViewOrders}
            className="flex-1 rounded-full bg-charcoal py-2.5 text-sm font-semibold text-white hover:bg-charcoal/90 transition shadow-sm"
          >
            View in Neon DB Orders
          </button>
        </div>
      </div>
    </div>
  )
}
