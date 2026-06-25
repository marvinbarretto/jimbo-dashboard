import { Pipe, PipeTransform } from '@angular/core';
import { formatLondonTime } from '@shared/utils/datetime.utils';

/**
 * HH:MM of a timestamp in Europe/London. Pure — Angular memoises it, and it
 * keeps `new Date()` out of templates. Use where the day is bucketed by the
 * London calendar (nutrition, exercise) so display matches the server boundary.
 */
@Pipe({ name: 'londonTime', pure: true })
export class LondonTimePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? formatLondonTime(value) : '—';
  }
}
