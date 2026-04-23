// Diagnostic page — not production. Used to verify signal forms vs ReactiveFormsModule
// behaviour with Playwright in a zoneless Angular app.
import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';

interface TestModel {
  id: string;
  display_name: string;
}

@Component({
  selector: 'app-test-forms-page',
  imports: [ReactiveFormsModule, FormField, FormRoot, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <h1>Form test bench</h1>

      <div class="bench">
        <!-- ── Reactive form ── -->
        <section>
          <h2>ReactiveFormsModule</h2>
          <form [formGroup]="reactiveForm" (ngSubmit)="submitReactive()" data-testid="reactive-form">
            <div class="field">
              <label for="r-id">ID</label>
              <input id="r-id" type="text" formControlName="id" data-testid="reactive-id" />
            </div>
            <div class="field">
              <label for="r-name">Display name</label>
              <input id="r-name" type="text" formControlName="display_name" data-testid="reactive-name" />
            </div>
            <button type="submit" data-testid="reactive-submit">Submit</button>
          </form>

          @if (reactiveResult()) {
            <pre data-testid="reactive-result">{{ reactiveResult() | json }}</pre>
          }
        </section>

        <!-- ── Signal form ── -->
        <section>
          <h2>Signal forms (@experimental)</h2>
          <form [formRoot]="signalForm" (ngSubmit)="submitSignal()" data-testid="signal-form">
            <div class="field">
              <label for="s-id">ID</label>
              <input id="s-id" type="text" [formField]="signalForm.id" data-testid="signal-id" />
            </div>
            <div class="field">
              <label for="s-name">Display name</label>
              <input id="s-name" type="text" [formField]="signalForm.display_name" data-testid="signal-name" />
            </div>
            <button type="submit" data-testid="signal-submit">Submit</button>
          </form>

          @if (signalResult()) {
            <pre data-testid="signal-result">{{ signalResult() | json }}</pre>
          }
        </section>
      </div>
    </div>
  `,
  styles: [`.bench { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 800px; }`],
})
export class TestFormsPage {
  // ReactiveFormsModule
  readonly reactiveForm = new FormBuilder().nonNullable.group({
    id: ['', Validators.required],
    display_name: ['', Validators.required],
  });
  readonly reactiveResult = signal<TestModel | null>(null);

  submitReactive(): void {
    if (this.reactiveForm.invalid) return;
    this.reactiveResult.set(this.reactiveForm.getRawValue());
  }

  // Signal forms
  readonly signalModel = signal<TestModel>({ id: '', display_name: '' });
  readonly signalForm = form(this.signalModel, (fields) => {
    required(fields.id);
    required(fields.display_name);
  });
  readonly signalResult = signal<TestModel | null>(null);

  submitSignal(): void {
    const m = this.signalModel();
    if (!m.id || !m.display_name) return;
    this.signalResult.set({ ...m });
  }
}
