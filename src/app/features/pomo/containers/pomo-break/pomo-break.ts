import { ChangeDetectionStrategy, Component, computed, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiButton } from '@shared/components/ui-button/ui-button';

// Default break duration in minutes — will become server-driven once
// the extension passes break length in the navigation state.
const BREAK_MINUTES = 5;

@Component({
  selector: 'app-pomo-break',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UiStack, UiCard, UiButton],
  templateUrl: './pomo-break.html',
  styleUrl: './pomo-break.scss',
})
export class PomoBreak implements OnDestroy {
  private readonly endTime = Date.now() + BREAK_MINUTES * 60 * 1000;
  private readonly now = signal(Date.now());
  private readonly handle = setInterval(() => this.now.set(Date.now()), 1000);

  readonly remainingSeconds = computed(() =>
    Math.max(0, Math.round((this.endTime - this.now()) / 1000)),
  );

  readonly displayTime = computed(() => {
    const t = this.remainingSeconds();
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  readonly isOver = computed(() => this.remainingSeconds() === 0);

  ngOnDestroy(): void {
    clearInterval(this.handle);
  }
}
