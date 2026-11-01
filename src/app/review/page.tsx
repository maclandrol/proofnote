import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewedPaper } from "@/components/proof-atlas/ReviewedPaper";

export const metadata: Metadata = {
  title: "Paper report — Proof Notes",
  description: "The mathematical claims checked in an ML paper: what fails, the evidence, how much it matters and how it could be repaired.",
  alternates: { canonical: "/review" },
};

export default function ReviewPage() {
  return <Suspense fallback={<p role="status">Loading review…</p>}><ReviewedPaper /></Suspense>;
}
