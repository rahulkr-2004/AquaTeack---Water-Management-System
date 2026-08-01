import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function InvoiceModal({ invoice, onClose, allowPay = false, onPay, payingId, onDownload }) {
  if (!invoice) return null;
  const amount = invoice.amount.toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative text-slate-900 dark:text-slate-100">
        <div className="bg-slate-50 dark:bg-slate-950 p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="text-slate-900 dark:text-slate-100 font-black text-lg">Invoice Details</h3>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-mono mt-0.5">#{invoice.invoiceNumber}</p>
          </div>
          <div className="flex items-center">
            {onDownload && (
              <button onClick={() => onDownload(invoice.id)} className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition mr-4 cursor-pointer" title="Download PDF">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition cursor-pointer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="block text-slate-500 dark:text-slate-400 uppercase tracking-wide font-bold text-[9px] mb-1">Billing Period</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{invoice.billingCycle?.startDate} to {invoice.billingCycle?.endDate}</span>
            </div>
            <div>
              <span className="block text-slate-500 dark:text-slate-400 uppercase tracking-wide font-bold text-[9px] mb-1">Consumption</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{invoice.consumptionLiters?.toLocaleString()} Liters</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Itemized Breakdown</h4>
            <div className="space-y-2 text-xs font-medium">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Base Charge</span>
                <span>₹{(invoice.baseCharge || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Excess Charge</span>
                <span>₹{(invoice.excessCharge || 0).toFixed(2)}</span>
              </div>
              {(invoice.sharedCostAllocation > 0) && (
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Shared Area Allocation</span>
                  <span>₹{(invoice.sharedCostAllocation || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Tax (GST 5%)</span>
                <span>₹{(invoice.taxAmount ?? (((invoice.baseCharge || 0) + (invoice.excessCharge || 0) + (invoice.sharedCostAllocation || 0)) * 0.05)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Platform Convenience Fee</span>
                <span>₹{(invoice.platformFee ?? 5.00).toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Total Amount Payable</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-black text-2xl">₹{amount}</span>
            </div>
          </div>

          {invoice.paid ? (
            <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-emerald-300 dark:border-emerald-500/30 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
              <div className="bg-emerald-100 dark:bg-emerald-500/20 p-3 rounded-full mb-3">
                <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-500" />
              </div>
              <h4 className="text-emerald-600 dark:text-emerald-400 font-black tracking-widest uppercase text-xl">PAID</h4>
              <p className="text-slate-600 dark:text-slate-400 text-[10px] mt-1 text-center font-medium">This invoice has been successfully settled.</p>
              
              {(invoice.razorpayPaymentId || invoice.razorpayOrderId) && (
                <div className="mt-4 w-full px-4 text-center border-t border-emerald-200 dark:border-emerald-500/20 pt-3">
                  <p className="text-emerald-700 dark:text-emerald-500/80 text-[10px] uppercase font-bold tracking-wider mb-1">Transaction Details</p>
                  {invoice.razorpayPaymentId && <p className="text-emerald-600 dark:text-emerald-400/80 text-[10px] font-mono mb-0.5">ID: {invoice.razorpayPaymentId}</p>}
                  {invoice.razorpayOrderId && <p className="text-emerald-600 dark:text-emerald-400/80 text-[10px] font-mono">Order: {invoice.razorpayOrderId}</p>}
                </div>
              )}
            </div>
          ) : !invoice.paid && allowPay ? (
            <div className="flex flex-col items-center justify-center space-y-4 pt-2">
              {/* Razorpay branded payment section */}
              <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <svg width="28" height="28" viewBox="0 0 135 39" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M45.8 30.2L51.5 8.8H57.2L55.6 14.7C56.9 13 58.6 12.1 60.7 12.1C63.6 12.1 65.5 13.9 65.5 16.9C65.5 17.6 65.4 18.4 65.1 19.3L62.7 30.2H57.1L59.3 20.3C59.4 19.9 59.5 19.4 59.5 18.9C59.5 17.6 58.8 16.8 57.5 16.8C55.8 16.8 54.4 18 53.9 20.1L51.6 30.2H45.8Z" fill="#2EB8E6"/>
                    <path d="M67.5 30.2L72 12.5H77.7L73.2 30.2H67.5ZM78.1 10.3C78.1 11.9 76.8 13.2 75.1 13.2C73.4 13.2 72.2 12 72.2 10.4C72.2 8.8 73.5 7.5 75.2 7.5C76.9 7.5 78.1 8.7 78.1 10.3Z" fill="#2EB8E6"/>
                    <path d="M22 7.7L11.5 31.3L0 8.8H7.3L11.6 18.3L18.5 7.7H22Z" fill="#2EB8E6"/>
                    <path d="M33.6 7.7L24.4 23.4L22.4 31.3H16.1L20.7 12.8L33.6 7.7Z" fill="#072654"/>
                  </svg>
                  <span className="text-slate-900 dark:text-slate-200 font-bold text-sm">Pay Securely with Razorpay</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] text-center leading-relaxed">
                  Pay via Credit/Debit Card, UPI, Net Banking, or Wallets.<br/>
                  Secured by 256-bit SSL encryption.
                </p>
                <div className="flex gap-2 flex-wrap justify-center">
                  {['VISA', 'MC', 'UPI', 'NB'].map(m => (
                    <span key={m} className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 text-[9px] font-bold tracking-wider border border-slate-300 dark:border-slate-700">{m}</span>
                  ))}
                </div>
              </div>
              <button
                disabled={payingId === invoice.id}
                onClick={() => onPay && onPay(invoice.id)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                {payingId === invoice.id ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    Pay ₹{invoice.amount?.toFixed(2)} Now
                  </>
                )}
              </button>
              <p className="text-slate-500 dark:text-slate-600 text-[9px] text-center">You'll be redirected to Razorpay secure checkout</p>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-red-300 dark:border-red-500/30 rounded-xl bg-red-50 dark:bg-red-950/20">
               <h4 className="text-red-600 dark:text-red-400 font-black tracking-widest uppercase text-xl">UNPAID</h4>
               <p className="text-slate-600 dark:text-slate-400 text-[10px] mt-1 text-center font-medium">Payment is pending for this cycle.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
