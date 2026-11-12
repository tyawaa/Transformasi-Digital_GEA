/** Encode teks sebagai literal PostgreSQL untuk skrip seed dan pembaruan konten. */
export function quote(value: string): string {
  return "'" + value.replaceAll("'", "''") + "'";
}
