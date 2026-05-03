import { Pipe, PipeTransform } from '@angular/core';
import { relativeTime } from '@shared/utils/datetime.utils';

@Pipe({ name: 'relativeTime', pure: true })
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return relativeTime(value);
  }
}
