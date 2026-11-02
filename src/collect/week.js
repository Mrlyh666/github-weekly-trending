// ISO 8601 week number as 'YYYY-Www'.
// A week starts on Monday; week 1 is the week containing the first Thursday
// of the year.
export function isoWeek(date) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // Monday=1 ... Sunday=7
  const day = d.getUTCDay() || 7;
  // Move to the Thursday of this week, which is always in the correct ISO year.
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}