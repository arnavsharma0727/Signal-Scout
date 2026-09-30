export const TIME_ZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'U.S. Eastern' },
  { value: 'America/Chicago', label: 'U.S. Central' },
  { value: 'America/Los_Angeles', label: 'U.S. Pacific' },
  { value: 'Asia/Seoul', label: 'Korea (Seoul)' },
] as const;

export type DisplayTimeZone = (typeof TIME_ZONE_OPTIONS)[number]['value'];

export function isDisplayTimeZone(value: string): value is DisplayTimeZone {
  return TIME_ZONE_OPTIONS.some((option) => option.value === value);
}
