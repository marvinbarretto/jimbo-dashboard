import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  ViewEncapsulation,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { ActorsService } from '@features/actors/data-access/actors.service';
import { ProjectsService } from '@features/projects/data-access/projects.service';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import type { EntityType } from '@shared/components/entity-chip/entity-chip';

type MentionTrigger = '@' | '#' | '/';

interface MentionItem {
  type: EntityType;
  id: string;
  label: string;
  seq?: number;
}

interface MentionState {
  open: boolean;
  trigger: MentionTrigger;
  query: string;
  x: number;
  y: number;
  highlightIndex: number;
}

const CLOSED: MentionState = { open: false, trigger: '@', query: '', x: 0, y: 0, highlightIndex: 0 };

// Serialised mention token format: @[label](id) / #[label](id) / /[label](id)
const MENTION_RE = /(@|#|\/)\[([^\]]+)\]\(([^)]+)\)/g;
// Trigger detection: optional leading whitespace/comma, trigger char, word chars, end.
// Group 1 = leading separator (may be empty), group 2 = trigger, group 3 = query.
const TRIGGER_RE = /(^|[\s,])(@|#|\/)(\w*)$/;

/** Parses a serialised body string into DOM nodes for the editor. */
function deserialise(text: string, doc: Document): Node[] {
  const nodes: Node[] = [];
  let last = 0;

  for (const m of text.matchAll(MENTION_RE)) {
    if (m.index > last) {
      nodes.push(doc.createTextNode(text.slice(last, m.index)));
    }
    nodes.push(buildChipNode(doc, triggerToType(m[1] as MentionTrigger), m[3], m[2], undefined));
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    nodes.push(doc.createTextNode(text.slice(last)));
  }
  if (nodes.length === 0) {
    nodes.push(doc.createTextNode(''));
  }
  return nodes;
}

function buildChipNode(
  doc: Document, type: EntityType, id: string, label: string, seq?: number
): HTMLSpanElement {
  const span = doc.createElement('span');
  span.contentEditable = 'false';
  span.className = `entity-chip entity-chip--${type} entity-chip--${id}`;
  span.dataset['mentionType'] = type;
  span.dataset['mentionId'] = id;
  span.dataset['mentionLabel'] = label;
  if (seq !== undefined) span.dataset['mentionSeq'] = String(seq);
  span.setAttribute('aria-label', `${typePrefix(type)}${seq !== undefined ? seq + ' · ' : ''}${label}`);

  const prefix = doc.createElement('span');
  prefix.className = 'entity-chip__prefix';
  prefix.setAttribute('aria-hidden', 'true');
  prefix.textContent = typePrefix(type);
  span.appendChild(prefix);

  if (type === 'vault-item' && seq !== undefined) {
    const seqEl = doc.createElement('span');
    seqEl.className = 'entity-chip__seq';
    seqEl.textContent = String(seq);
    span.appendChild(seqEl);
    const sep = doc.createElement('span');
    sep.className = 'entity-chip__sep';
    sep.setAttribute('aria-hidden', 'true');
    sep.textContent = ' · ';
    span.appendChild(sep);
  }

  span.appendChild(doc.createTextNode(label));
  return span;
}

function typePrefix(type: EntityType): string {
  if (type === 'actor') return '@';
  if (type === 'project') return '/';
  return '#';
}

function triggerToType(t: MentionTrigger): EntityType {
  if (t === '@') return 'actor';
  if (t === '/') return 'project';
  return 'vault-item';
}

/** Walks the editor DOM and serialises it back to the mention token format. */
function serialise(div: HTMLElement): string {
  let out = '';
  for (const node of div.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const id    = el.dataset['mentionId'];
      const label = el.dataset['mentionLabel'];
      const type  = el.dataset['mentionType'] as EntityType | undefined;
      if (id && label && type) {
        out += `${typePrefix(type)}[${label}](${id})`;
      } else if (el.tagName === 'BR') {
        out += '\n';
      } else {
        out += el.textContent ?? '';
      }
    }
  }
  return out.replace(/ /g, ' ');
}

@Component({
  selector: 'app-smart-composer-input',
  // ViewEncapsulation.None so the entity-chip styles inside contenteditable
  // (dynamically inserted DOM nodes) receive the global class rules.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SmartComposerInput),
    multi: true,
  }],
  template: `
    <div class="smart-composer" #container>
      <div
        #editor
        class="smart-composer__editor"
        contenteditable="true"
        role="textbox"
        aria-multiline="true"
        [attr.aria-label]="ariaLabel()"
        [attr.data-placeholder]="placeholder()"
        (input)="onInput()"
        (keydown)="onKeydown($event)"
        (blur)="onTouched()"
      ></div>

      @if (mention().open) {
        <div
          class="smart-composer__mention-panel"
          [style.top.px]="mention().y"
          [style.left.px]="mention().x"
          role="listbox"
          [attr.aria-label]="mentionLabel()">
          @for (item of mentionItems(); track item.id; let i = $index) {
            <button
              type="button"
              class="smart-composer__mention-option"
              [class.smart-composer__mention-option--active]="i === mention().highlightIndex"
              role="option"
              [attr.aria-selected]="i === mention().highlightIndex"
              (mousedown)="$event.preventDefault()"
              (click)="pickMention(item)">
              <span [class]="'entity-chip entity-chip--' + item.type + ' entity-chip--' + item.id">
                <span class="entity-chip__prefix" aria-hidden="true">{{ triggerFor(item.type) }}</span>
                @if (item.type === 'vault-item' && item.seq !== undefined) {
                  <span class="entity-chip__seq">{{ item.seq }}</span>
                  <span class="entity-chip__sep" aria-hidden="true"> · </span>
                }{{ item.label }}
              </span>
            </button>
          }
          @empty {
            <span class="smart-composer__mention-empty">No results for "{{ mention().query }}"</span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .smart-composer {
      position: relative;
    }

    .smart-composer__editor {
      width: 100%;
      min-height: 4.5rem;
      padding: 0.5rem 0.6rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      color: var(--color-text);
      font: inherit;
      font-size: 0.9rem;
      line-height: 1.6;
      outline: none;
      word-break: break-word;
      white-space: pre-wrap;
    }

    .smart-composer__editor:focus {
      border-color: var(--color-accent);
      box-shadow: var(--shadow-soft);
    }

    /* Placeholder via data attribute — only shown when editor has no meaningful content */
    .smart-composer__editor:empty::before,
    .smart-composer__editor[data-empty='true']::before {
      content: attr(data-placeholder);
      color: var(--color-text-muted);
      pointer-events: none;
      position: absolute;
    }

    .smart-composer__mention-panel {
      position: absolute;
      z-index: 30;
      min-width: 14rem;
      max-width: 22rem;
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      box-shadow: 0 6px 18px color-mix(in srgb, var(--color-bg) 60%, transparent);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .smart-composer__mention-option {
      display: flex;
      align-items: center;
      padding: 0.35rem 0.65rem;
      background: none;
      border: none;
      border-bottom: 1px solid var(--color-border);
      font: inherit;
      cursor: pointer;
      text-align: left;
      color: var(--color-text);
      width: 100%;

      &:last-child { border-bottom: none; }
      &:hover, &--active {
        background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
      }
    }

    .smart-composer__mention-empty {
      padding: 0.5rem 0.65rem;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      font-style: italic;
    }

    /* Entity chip styles — global because chips are inserted dynamically into
       contenteditable and won't receive Angular's scoped _ngcontent attributes. */
    .entity-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.05em;
      font-size: 0.72rem;
      font-family: var(--font-mono);
      padding: 0.1rem 0.45rem 0.1rem 0.3rem;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-border) 40%, transparent);
      color: var(--color-text-muted);
      line-height: 1.4;
      white-space: nowrap;
      vertical-align: baseline;
      user-select: none;
    }

    .entity-chip__prefix {
      opacity: 0.6;
      font-size: 0.65em;
      margin-right: 0.1em;
    }

    .entity-chip--actor.entity-chip--marvin { color: var(--actor-color-marvin); border-color: color-mix(in srgb, var(--actor-color-marvin) 40%, var(--color-border)); }
    .entity-chip--actor.entity-chip--ralph  { color: var(--actor-color-ralph);  border-color: color-mix(in srgb, var(--actor-color-ralph)  40%, var(--color-border)); }
    .entity-chip--actor.entity-chip--boris  { color: var(--actor-color-boris);  border-color: color-mix(in srgb, var(--actor-color-boris)  40%, var(--color-border)); }
    .entity-chip--actor.entity-chip--jimbo  { color: var(--actor-color-jimbo);  border-color: color-mix(in srgb, var(--actor-color-jimbo)  40%, var(--color-border)); }

    .entity-chip--project.entity-chip--hermes     { color: var(--project-color-hermes);     border-color: color-mix(in srgb, var(--project-color-hermes)     40%, var(--color-border)); }
    .entity-chip--project.entity-chip--localshout { color: var(--project-color-localshout); border-color: color-mix(in srgb, var(--project-color-localshout) 40%, var(--color-border)); }
    .entity-chip--project.entity-chip--dashboard  { color: var(--project-color-dashboard);  border-color: color-mix(in srgb, var(--project-color-dashboard)  40%, var(--color-border)); }
    .entity-chip--project.entity-chip--personal   { color: var(--project-color-personal);   border-color: color-mix(in srgb, var(--project-color-personal)   40%, var(--color-border)); }

    .entity-chip--vault-item {
      color: var(--color-accent);
      border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
    }
  `],
})
export class SmartComposerInput implements ControlValueAccessor, AfterViewInit {
  private readonly actorsService    = inject(ActorsService);
  private readonly projectsService  = inject(ProjectsService);
  private readonly vaultItemsService = inject(VaultItemsService);

  readonly placeholder = input('Type your message…  @ person  # task  / project');
  readonly ariaLabel   = input('Message body');

  @ViewChild('editor')    private editorEl!:    ElementRef<HTMLDivElement>;
  @ViewChild('container') private containerEl!: ElementRef<HTMLDivElement>;

  readonly mention = signal<MentionState>(CLOSED);

  private onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};
  private pendingValue: string | null = null;

  ngAfterViewInit(): void {
    if (this.pendingValue !== null) {
      this._applyValue(this.pendingValue);
      this.pendingValue = null;
    }
  }

  readonly mentionLabel = computed(() => {
    const t = this.mention().trigger;
    if (t === '@') return 'Select a person';
    if (t === '/') return 'Select a project';
    return 'Select a task';
  });

  readonly mentionItems = computed((): MentionItem[] => {
    const m = this.mention();
    if (!m.open) return [];
    const q = m.query.toLowerCase();

    switch (m.trigger) {
      case '@': return this.actorsService.activeActors()
        .map(a => ({ type: 'actor' as const, id: a.id, label: a.display_name }))
        .filter(i => i.label.toLowerCase().includes(q))
        .slice(0, 8);

      case '/': return this.projectsService.activeProjects()
        .map(p => ({ type: 'project' as const, id: p.id, label: p.display_name }))
        .filter(i => i.label.toLowerCase().includes(q))
        .slice(0, 8);

      case '#': return this.vaultItemsService.activeItems()
        .map(v => ({ type: 'vault-item' as const, id: v.id, label: v.title, seq: v.seq }))
        .filter(i => i.label.toLowerCase().includes(q))
        .slice(0, 8);
    }
  });

  triggerFor(type: EntityType): string {
    if (type === 'actor') return '@';
    if (type === 'project') return '/';
    return '#';
  }

  // ── ControlValueAccessor ───────────────────────────────────────────────────

  writeValue(value: string): void {
    if (!this.editorEl) {
      this.pendingValue = value ?? '';
      return;
    }
    this._applyValue(value ?? '');
  }

  private _applyValue(value: string): void {
    const editor = this.editorEl.nativeElement;
    editor.innerHTML = '';
    for (const node of deserialise(value, document)) {
      editor.appendChild(node);
    }
    this.updatePlaceholderState();
  }

  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void         { this.onTouched = fn; }

  // ── Event handlers ─────────────────────────────────────────────────────────

  onInput(): void {
    this.updatePlaceholderState();
    this.detectMention();
    this.onChange(serialise(this.editorEl.nativeElement));
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.mention().open) {
      this.handleMentionKeydown(event);
      return;
    }

    // Cmd/Ctrl+Enter can be caught by the parent — let it bubble.
  }

  // ── Mention logic ──────────────────────────────────────────────────────────

  private detectMention(): void {
    const editor = this.editorEl.nativeElement;
    const sel = window.getSelection();

    if (!sel || sel.rangeCount === 0 || !editor.contains(sel.focusNode)) {
      this.mention.set(CLOSED);
      return;
    }

    const range = sel.getRangeAt(0);
    if (range.startContainer.nodeType !== Node.TEXT_NODE) {
      this.mention.set(CLOSED);
      return;
    }

    const text       = range.startContainer.textContent ?? '';
    const cursor     = range.startOffset;
    const textBefore = text.slice(0, cursor);
    const match      = TRIGGER_RE.exec(textBefore);

    if (!match) {
      this.mention.set(CLOSED);
      return;
    }

    const trigger = match[2] as MentionTrigger;
    const query   = match[3];

    // Position dropdown just below the caret
    const caretRect     = range.getBoundingClientRect();
    const containerRect = this.containerEl.nativeElement.getBoundingClientRect();
    const x = Math.max(0, caretRect.left - containerRect.left - 8);
    const y = caretRect.bottom - containerRect.top + 4;

    this.mention.update(prev => ({
      open:           true,
      trigger,
      query,
      x,
      y,
      highlightIndex: prev.open && prev.trigger === trigger ? prev.highlightIndex : 0,
    }));
  }

  private handleMentionKeydown(event: KeyboardEvent): void {
    const items = this.mentionItems();
    const { highlightIndex } = this.mention();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.mention.update(m => ({ ...m, highlightIndex: (highlightIndex + 1) % Math.max(items.length, 1) }));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.mention.update(m => ({ ...m, highlightIndex: (highlightIndex - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1) }));
        break;
      case 'Enter':
        event.preventDefault();
        if (items[highlightIndex]) this.pickMention(items[highlightIndex]);
        break;
      case 'Escape':
        event.preventDefault();
        this.mention.set(CLOSED);
        break;
    }
  }

  pickMention(item: MentionItem): void {
    const editor = this.editorEl.nativeElement;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range  = sel.getRangeAt(0);
    const node   = range.startContainer;
    const cursor = range.startOffset;

    if (node.nodeType !== Node.TEXT_NODE) return;

    const textBefore  = (node.textContent ?? '').slice(0, cursor);
    const triggerMatch = TRIGGER_RE.exec(textBefore);
    if (!triggerMatch) return;

    // tokenStart skips the leading separator (group 1) — only delete trigger + query
    const tokenStart  = cursor - triggerMatch[0].length + triggerMatch[1].length;
    const deleteRange = document.createRange();
    deleteRange.setStart(node, tokenStart);
    deleteRange.setEnd(node, cursor);
    deleteRange.deleteContents();

    // Insert the chip node
    const chip = buildChipNode(document, item.type, item.id, item.label, item.seq);
    const afterCursor = sel.getRangeAt(0);
    afterCursor.insertNode(chip);

    // Insert a zero-width space after so the cursor lands outside the chip
    const spacer = document.createTextNode('​');
    chip.after(spacer);

    const newRange = document.createRange();
    newRange.setStartAfter(spacer);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    this.mention.set(CLOSED);
    this.updatePlaceholderState();
    this.onChange(serialise(editor));
  }

  private updatePlaceholderState(): void {
    const editor = this.editorEl?.nativeElement;
    if (!editor) return;
    // Empty check: only text/chip nodes present with no visible content
    const hasContent = serialise(editor).replace(/​/g, '').trim().length > 0;
    editor.dataset['empty'] = hasContent ? 'false' : 'true';
    if (!hasContent) editor.innerHTML = '';
  }
}
