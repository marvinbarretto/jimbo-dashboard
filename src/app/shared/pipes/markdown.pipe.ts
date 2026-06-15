import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    // marked.parse() is synchronous and returns a string.
    // Angular's [innerHTML] binding sanitizes the output (strips scripts, handlers, etc).
    return marked.parse(value) as string;
  }
}
