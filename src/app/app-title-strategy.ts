import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

const SUFFIX = 'Jimbo';

export function formatPageTitle(label: string | null | undefined): string {
  return label ? `${label} · ${SUFFIX}` : SUFFIX;
}

@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.title.setTitle(formatPageTitle(this.buildTitle(snapshot)));
  }
}
