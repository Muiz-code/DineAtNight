"use client";
import { useState } from "react";
import type { DanTicket } from "@/lib/firestore";
import { groupTicketOrders } from "@/lib/ticketInventory";

const money = (n: number) => "\u20a6" + (n / 100).toLocaleString("en-NG");
export default function TicketOrders({ tickets, onResend }: { tickets: DanTicket[]; onResend: (t: DanTicket) => void }) {
  const [page, setPage] = useState(0);
  const orders = groupTicketOrders(tickets);
  const pages = Math.max(1, Math.ceil(orders.length / 10));
  const current = Math.min(page, pages - 1);
  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-gray-400">{orders.length} paid orders | {tickets.length} QR codes | {tickets.reduce((n,t) => n+t.quantity,0)} admissions</p>
      <div className="flex gap-3 text-xs text-gray-300">
        <button disabled={current === 0} onClick={() => setPage(current-1)} className="disabled:opacity-30">Previous</button>
        <span>{current+1} / {pages}</span>
        <button disabled={current === pages-1} onClick={() => setPage(current+1)} className="disabled:opacity-30">Next</button>
      </div>
    </div>
    {!orders.length && <p className="text-gray-500 py-8">No paid orders for this event yet.</p>}
    {orders.slice(current*10,current*10+10).map(order => <details key={order.reference} className="rounded-xl border border-white/10 bg-[#0a0a0a] overflow-hidden" open>
      <summary className="cursor-pointer p-4 text-white">
        <span className="font-semibold">{order.buyer?.name ?? order.holders[0]?.purchasedBy ?? "Buyer unavailable"}</span>
        <span className="ml-3 text-[#FFFF00]">{order.quantity} admissions | {money(order.amount)} paid</span>
        <span className="block text-xs text-gray-400 mt-2 break-all">{order.reference} | {order.holders[0]?.ticketType ?? "General admission"} | {order.checkedIn}/{order.quantity} admissions checked in</span>
        {order.buyer?.coupon && <span className="block text-xs text-[#00FF41] mt-1 break-all">Code {order.buyer.coupon.code} (#{order.buyer.coupon.codeNumber} of {order.buyer.coupon.codeCount}, {order.buyer.coupon.campaignName}) | {order.buyer.coupon.percentOff}% off 1 ticket | -{money(order.buyer.coupon.discountKobo)}{order.amount === 0 ? " | Free, no Paystack payment" : ""}</span>}
        {order.holders.some(t => t.entryOverride) && <span className="block text-xs text-[#FF9F1C] mt-1">Admitted outside entry time by {order.holders.filter(t => t.entryOverride).map(t => t.entryOverride!.by).join(", ")}</span>}
        <span className="block text-xs text-gray-500 mt-1">{order.holders.length > 1 ? "Separate QR codes emailed to ticket holders" : order.quantity > 1 ? "Shared group QR - admits the whole group together" : "One ticket QR"}
          {order.purchasedAt ? " | Purchased " + new Date(order.purchasedAt.seconds*1000).toLocaleString("en-NG", { timeZone: "Africa/Lagos", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : ""}</span>
      </summary>
      <div className="border-t border-white/10 divide-y divide-white/5">
        {order.holders.map(t => <div key={t.reference} className="px-4 py-3 sm:pl-8 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0"><p className="text-sm text-white">{t.name} <span className="text-gray-500 text-xs">{t.parentReference ? "Guest" : "Buyer"}</span></p>
            <p className="text-xs text-gray-400 break-all">{t.email}</p>
            <p className="text-xs text-gray-500 break-all mt-1">{t.reference} | {t.quantity} admission{t.quantity===1 ? "" : "s"} | Included in order</p>
          </div>
          <div className="flex items-center gap-3"><span className={t.status==="confirmed" ? "text-xs text-[#00FF41]" : "text-xs text-[#FFFF00]"}>{t.status === "confirmed" ? "Checked in" : "Awaiting check-in"}</span>
            <button onClick={() => onResend(t)} className="text-xs text-white border border-white/15 rounded-lg px-3 py-2">Resend ticket</button></div>
        </div>)}
      </div>
    </details>)}
  </section>;
}
