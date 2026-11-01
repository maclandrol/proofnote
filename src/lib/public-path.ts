/** Public downloads need the deployment prefix; Next Link handles page routes. */
export function publicPath(path: string): string {
  return path.startsWith("/") && !path.startsWith("//")
    ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`
    : path;
}
