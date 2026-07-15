// Built from local Y/M/D getters (not toISOString, which converts to UTC and
// can shift the date by a day depending on the device's timezone).
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// HH:MM, 24-hour, from local getters - same "store what the clock actually
// showed, no UTC conversion" reasoning as formatDateISO above. Only the
// time-of-day components of `date` matter here; its date part is whatever
// the picker happened to construct the Date around, not meaningful.
export function formatTimeHHMM(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
