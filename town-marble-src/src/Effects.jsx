import React, { useEffect, useRef, useState } from "react";
import { money } from "../shared/data.js";

export function Cash({ amount }) {
  const previous = useRef(amount),
    [delta, setDelta] = useState(0);
  useEffect(() => {
    setDelta(amount - previous.current);
    previous.current = amount;
    const timer = setTimeout(() => setDelta(0), 1700);
    return () => clearTimeout(timer);
  }, [amount]);
  return (
    <span className="cash-value">
      {money(amount)}
      {delta !== 0 && (
        <i
          key={amount}
          className={`cash-delta ${delta > 0 ? "plus" : "minus"}`}
        >
          {delta > 0 ? "+" : "−"}
          {money(Math.abs(delta))}
        </i>
      )}
    </span>
  );
}
export function PaymentEffects({ payment, reduced }) {
  const ref = useRef(null),
    seen = useRef(payment?.id);
  useEffect(() => {
    if (!payment || seen.current === payment.id) return;
    seen.current = payment.id;
    if (reduced || document.hidden) return;
    const cards = [...document.querySelectorAll("[data-player]")];
    const source = cards.find((card) => card.dataset.player === payment.from);
    const target =
      cards.find((card) => card.dataset.player === payment.to) ||
      document.querySelector(
        payment.to === "fund"
          ? ".tile-fundGet"
          : ".world-viewport, .island-center",
      );
    if (!source || !target) return;
    const a = source.getBoundingClientRect(),
      b = target.getBoundingClientRect();
    const from = { x: a.left + a.width / 2, y: a.top + a.height / 2 },
      to = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    const animations = [...ref.current.children].map((coin, i) =>
      coin.animate(
        [
          {
            transform: `translate(${from.x}px,${from.y}px) scale(.5)`,
            opacity: 0,
          },
          {
            transform: `translate(${from.x}px,${from.y - 15}px) scale(1)`,
            opacity: 1,
            offset: 0.15,
          },
          {
            transform: `translate(${(from.x + to.x) / 2}px,${Math.min(from.y, to.y) - 50}px) scale(1)`,
            opacity: 1,
            offset: 0.55,
          },
          { transform: `translate(${to.x}px,${to.y}px) scale(.4)`, opacity: 0 },
        ],
        { duration: 850, delay: i * 75, easing: "ease-in-out" },
      ),
    );
    return () => animations.forEach((animation) => animation.cancel());
  }, [payment?.id, reduced]);
  return (
    <div className="payment-effects" ref={ref} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <i key={i}>✦</i>
      ))}
    </div>
  );
}
