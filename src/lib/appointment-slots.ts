import { WORKING_HOURS } from './constants';

/**
 * The hours a meeting can start at, in UAE time.
 *
 * Kept out of the appointment service because the rescheduling form is a client
 * component and the service reaches for the database.
 */
export function slotHours(): number[] {
  const hours: number[] = [];
  for (let hour = WORKING_HOURS.startHour; hour < WORKING_HOURS.endHour; hour += 1) {
    hours.push(hour);
  }
  return hours;
}

export const BOOKABLE_HOURS = slotHours();
