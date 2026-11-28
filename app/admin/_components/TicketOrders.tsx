"use client";
import { useState } from "react";
import type { DanTicket } from "@/lib/firestore";
import { groupTicketOrders, orderKind, TICKET_KINDS, type TicketKind } from "@/lib/ticketInventory";

const money = (n: number) => "\u20a6" + (n / 100).toLocaleString("en-NG");
export default function TicketOrders({ tickets, onResend }: { tickets: DanTicket[]; onResend: (t: DanTicket) => void }) {
  const [page, setPage] = useState(0);
  const [kindFilter, setKindFilter] = useState<TicketKind | "all">("all");
  const allOrders = groupTicketOrders(tickets);
  const orders = kindFilter === "all" ? allOrders : allOrders.filter((o) => orderKind(o) === kindFilter);
  const shownTickets = orders.flatMap((o) => o.holders);
  const pickKind = (k: TicketKind | "all") => { setKindFilter(k); setPage(0); };
  const pages = Math.max(1, Math.ceil(orders.length / 10));
  const current = Math.min(page, pages - 1);
  return <section className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-gray-600 uppercase tracking-widest mr-1">Type</span>
              {([{ key: "all" as const, label: "All", hint: "" }, ...TICKET_KINDS]).map(({ key, label, hint }) => {
                const active = kindFilter === key;
                const count = key === "all" ? allOrders.length : allOrders.filter((o) => orderKind(o) === key).length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pickKind(key)}
                    title={hint}
                    aria-pressed={active}
                    className={"rounded-full border px-3 py-1.5 text-xs transition-all " + (active ? "border-[#FFFF00] text-[#FFFF00] bg-[#FFFF00]/5" : "border-white/10 text-gray-400 hover:border-white/25")}
                  >
                    {label} <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
              {kindFilter !== "all" && (
                <span className="text-xs text-gray-500">{TICKET_KINDS.find((k) => k.key === kindFilter)?.hint} · counts are orders</span>
              )}
            </div>
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-gray-400">{orders.length} paid orders | {shownTickets.length} QR codes | {shownTickets.reduce((n,t) => n+t.quantity,0)} admissions</p>
      <div className="flex gap-3 text-xs text-gray-300">
        <button disabled={current === 0} onClick={() => setPage(current-1)} className="disabled:opacity-30">Previous</button>
        <span>{current+1} / {pages}</span>
        <button disabled={current === pages-1} onClick={() => setPage(current+1)} className="disabled:opacity-30">Next</button>
      </div>
    </div>
    {!orders.length && <p className="text-gray-500 py-8">{kindFilter === "all" ? "No paid orders for this event yet." : "No orders of this type."}</p>}
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
