export function retryAfterSeconds(value:string|null,now=Date.now()):number|null {
  if (!value?.trim()) return null;
  const trimmed=value.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const seconds=Number(trimmed);
    return Number.isFinite(seconds)?Math.ceil(seconds):null;
  }
  // Reject negative or malformed numeric values before attempting an HTTP date.
  if (!/[a-z]/i.test(trimmed)) return null;
  const date=Date.parse(trimmed);
  return Number.isFinite(date)?Math.max(0,Math.ceil((date-now)/1000)):null;
}

export function isRetryableStatus(status:number) {
  return status===408 || status===429 || status===500 || status===502 || status===503 || status===504;
}
