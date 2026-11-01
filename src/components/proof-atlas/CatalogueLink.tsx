"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { catalogueHref, reportHref } from "@/lib/catalogue-navigation";

type Props = { children: ReactNode; className?: string; field?: string; tag?: string };

function hrefFor(search: string, { field, tag }: Props) {
  const params = new URLSearchParams(search);
  if (field !== undefined) params.set("field", field);
  if (tag !== undefined) params.set("tag", tag);
  if (field !== undefined || tag !== undefined) params.delete("page");
  return catalogueHref(params);
}

function ContextLink(props: Props) {
  const search = useSearchParams();
  return <Link href={hrefFor(search.toString(), props)} className={props.className}>{props.children}</Link>;
}

export function CatalogueLink(props: Props) {
  return <Suspense fallback={<Link href={hrefFor("", props)} className={props.className}>{props.children}</Link>}><ContextLink {...props} /></Suspense>;
}

type ReportProps = { children: ReactNode; className?: string; slug: string; noteUrl?: string };

function ContextReportLink(props: ReportProps) {
  const search = useSearchParams();
  return <Link href={reportHref(props, search.toString())} className={props.className}>{props.children}</Link>;
}

export function ReportLink(props: ReportProps) {
  return <Suspense fallback={<Link href={reportHref(props)} className={props.className}>{props.children}</Link>}><ContextReportLink {...props} /></Suspense>;
}
