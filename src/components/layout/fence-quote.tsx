"use client";

import { useState, useEffect } from "react";

const QUOTES = [
  "Good fences make good neighbors — and great invoices.",
  "Every post planted is a problem solved.",
  "We don't just build fences. We build boundaries with purpose.",
  "A fence without a good quote is just a wall.",
  "Chain link: because sometimes you need strength you can see through.",
  "Measure twice, dig once.",
  "The grass is always greener on the invoiced side.",
  "Behind every great yard is a fence that means business.",
  "Post holes: the original commitment issue.",
  "Fencing: turning property lines into works of art since forever.",
  "A good gate swings both ways — so does good customer service.",
  "Privacy fencing: for people who really commit to their opinions.",
  "Rails, posts, and pickets — the holy trinity of yard peace.",
  "You can't spell 'defense' without 'fence'.",
  "Not all heroes wear capes. Some string chain link.",
  "Gates open. Opportunities open. Invoices close.",
  "We take our fences seriously. Our quotes, even more so.",
  "Standing strong through wind, rain, and difficult permit offices.",
  "The fence that separates you from chaos? That's our work.",
  "Every panel tells a story. This one is yours.",
  "Built to last longer than the disagreement that started it.",
  "A straight fence line is a sign of a professional mind.",
  "Post caps: the finishing touch that says 'we care about details'.",
  "Install with integrity. Stand with strength.",
  "Some days you're the fence. Some days you're the wind. We help you be the fence.",
];

export function FenceQuote() {
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  return (
    <p className="hidden lg:block text-sm italic text-muted-foreground/80 truncate max-w-sm xl:max-w-md text-center select-none">
      &ldquo;{quote}&rdquo;
    </p>
  );
}
