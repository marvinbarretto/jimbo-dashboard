import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import type { VerbosityLevel } from '../verbosity';

@Component({
  selector: 'app-verbosity-toggle',
  imports: [],
  templateUrl: './verbosity-toggle.html',
  styleUrl: './verbosity-toggle.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerbosityToggleComponent {
  readonly value   = input.required<VerbosityLevel>();
  readonly changed = output<VerbosityLevel>();
}
