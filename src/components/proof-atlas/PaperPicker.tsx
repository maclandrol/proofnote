"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { reportHref } from "@/lib/catalogue-navigation";

type PaperPickerProps = { papers: { slug: string; title?: string; issueTitle: string; noteUrl?: string }[]; active: string };

export function PaperPicker(props: PaperPickerProps) {
  return <Suspense fallback={<PaperPickerBody {...props} />}><QueryPaperPicker {...props} /></Suspense>;
}

function QueryPaperPicker(props: PaperPickerProps) {
  const searchParams = useSearchParams();
  return <PaperPickerBody {...props} queryString={searchParams.toString()} />;
}

function PaperPickerBody({ papers, active, queryString = "" }: PaperPickerProps & { queryString?: string }) {
  const router = useRouter();
  return <label className="pa-mobile-picker"><span>Explore another paper</span><select aria-label="Choose a paper" value={active} onChange={e => {
    const paper = papers.find(p => p.slug === e.target.value);
    if (paper) router.push(reportHref(paper, queryString));
  }}>{papers.map(p => <option key={p.slug} value={p.slug}>{p.title ?? p.issueTitle}</option>)}</select></label>;
}
