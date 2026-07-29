import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiChecklist, type UiChecklistItem } from '@shared/components/ui-checklist/ui-checklist';
import type { MentionTrigger } from '@shared/mentions';
import { parseBulletLines, serializeBulletLines } from '@shared/utils/bullet-list.utils';

// A brief field for content that's really a list of independently-true
// statements (success criteria, common tasks, key resources, personas) —
// each amendable/removable on its own instead of hunting through one
// paragraph to fix the one line that's now wrong.
//
// Storage stays exactly what ProjectBriefField already writes: one markdown
// string ("- one\n- two"). The manifest sync and /project-brief skill see no
// change on the wire — this is purely a dashboard editing upgrade, wired
// through UiChecklist with `checkable: false` (these are standing facts,
// not completable to-dos).
@Component({
  selector: 'app-project-brief-bullet-field',
  imports: [UiChecklist],
  templateUrl: './project-brief-bullet-field.html',
  styleUrl: './project-brief-bullet-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectBriefBulletField {
  readonly label       = input.required<string>();
  readonly value       = input<string | null>(null);
  readonly placeholder = input<string>('+ add item (Enter)');
  readonly hint        = input<string | null>(null);
  readonly triggers    = input<MentionTrigger[]>([]);
  readonly readonly    = input<boolean>(false);

  readonly saved = output<string | null>();

  protected readonly items = computed<UiChecklistItem[]>(() =>
    parseBulletLines(this.value()).map(text => ({ text, done: false })),
  );

  protected onEdited({ index, text }: { index: number; text: string }): void {
    console.debug('[ProjectBriefBulletField] onEdited', { label: this.label(), index, text });
    const lines = this.items().map(i => i.text);
    lines[index] = text;
    this.commit(lines);
  }

  protected onRemoved(index: number): void {
    console.debug('[ProjectBriefBulletField] onRemoved', { label: this.label(), index });
    const lines = this.items().map(i => i.text);
    lines.splice(index, 1);
    this.commit(lines);
  }

  protected onAppended(text: string): void {
    console.debug('[ProjectBriefBulletField] onAppended', { label: this.label(), text });
    this.commit([...this.items().map(i => i.text), text]);
  }

  private commit(lines: string[]): void {
    const serialized = serializeBulletLines(lines);
    console.debug('[ProjectBriefBulletField] commit — emitting saved', { label: this.label(), serialized });
    this.saved.emit(serialized);
  }
}
