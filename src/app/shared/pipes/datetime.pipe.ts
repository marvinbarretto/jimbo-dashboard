import { Pipe, PipeTransform } from '@angular/core';
import { formatDatetime } from '@shared/utils/datetime.utils';

@Pipe({ name: 'datetime', pure: true })
export class DatetimePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatDatetime(value);
  }
}
