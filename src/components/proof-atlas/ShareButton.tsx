"use client";
import { useState } from "react";
export function ShareButton() {
  const [state, setState] = useState("Copy link");
  return <button className="pa-text-button" onClick={async () => {
    try { await navigator.clipboard.writeText(window.location.href); setState("Link copied"); }
    catch { setState("Copy the address above"); }
  }} aria-live="polite">{state} ↗</button>;
}
