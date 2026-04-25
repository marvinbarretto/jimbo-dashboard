import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import type { ThreadMessage, ThreadMessageKind, CreateThreadMessagePayload } from '../../../../domain/thread';
import type { VaultItemId, ActorId, ThreadMessageId } from '../../../../domain/ids';
import { threadMessageId } from '../../../../domain/ids';
import { AttachmentsService } from '../../data-access/attachments.service';

@Component({
  selector: 'app-message-composer',
  imports: [ReactiveFormsModule, SlicePipe],
  templateUrl: './message-composer.html',
  styleUrl: './message-composer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageComposer {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly attachmentsService = inject(AttachmentsService);

  readonly vaultItemId = input.required<VaultItemId>();
  readonly currentActor = input.required<ActorId>();
  // Only open (unanswered) questions are offered in the reply-to dropdown.
  readonly availableQuestions = input<ThreadMessage[]>([]);

  readonly posted = output<CreateThreadMessagePayload>();

  readonly kinds: ThreadMessageKind[] = ['comment', 'question', 'answer'];

  // Staged files waiting to be uploaded with the next message post.
  readonly stagedFiles = signal<File[]>([]);

  // Whether a drag is currently hovering over the drop zone — drives visual feedback.
  readonly isDragOver = signal(false);

  // Hidden file input — triggered programmatically by the "attach file" button.
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly form = this.fb.nonNullable.group({
    kind:        ['comment' as ThreadMessageKind, Validators.required],
    in_reply_to: ['' as string],  // empty string = null at submit boundary
    body:        ['', Validators.required],
  });

  constructor() {
    // When kind changes away from 'answer', clear in_reply_to and drop the validator.
    // effect() was tried here but form.controls.kind.value is not a signal — valueChanges is the reactive hook.
    this.form.controls.kind.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(kind => {
        const replyCtrl = this.form.controls.in_reply_to;
        if (kind === 'answer') {
          replyCtrl.setValidators(Validators.required);
        } else {
          replyCtrl.clearValidators();
          replyCtrl.setValue('');
        }
        replyCtrl.updateValueAndValidity();
      });
  }

  selectKind(kind: ThreadMessageKind): void {
    this.form.controls.kind.setValue(kind);
  }

  // Drag-and-drop handlers. preventDefault on dragover is required for drop to fire;
  // preventDefault on drop stops the browser navigating to the dropped file.
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files) this._stageFiles(files);
  }

  openFilePicker(): void {
    this.fileInput.nativeElement.click();
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this._stageFiles(input.files);
    // Reset input so the same file can be re-selected if removed then re-added.
    input.value = '';
  }

  removeStagedFile(index: number): void {
    this.stagedFiles.update(files => files.filter((_, i) => i !== index));
  }

  previewUrl(file: File): string | null {
    return file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    // Generate a client-side id so optimistic updates can track the row.
    const id = threadMessageId(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

    const payload: CreateThreadMessagePayload = {
      id,
      vault_item_id:   this.vaultItemId(),
      author_actor_id: this.currentActor(),
      kind:            v.kind,
      body:            v.body,
      in_reply_to:     v.in_reply_to ? (v.in_reply_to as ThreadMessageId) : null,
      answered_by:     null,
    };

    this.posted.emit(payload);

    // Fire uploads in parallel after emitting; each lands in the attachments signal map
    // independently. Caption is skipped in this pass — future pass can add per-attachment UI.
    const filesToUpload = this.stagedFiles();
    if (filesToUpload.length > 0) {
      Promise.all(
        filesToUpload.map(file => this.attachmentsService.upload(file, id))
      ).catch(() => {
        // Upload errors are handled inside AttachmentsService (optimistic fallback).
        // Nothing to do here.
      });
    }

    this.stagedFiles.set([]);
    this.form.reset({ kind: 'comment', in_reply_to: '', body: '' });
  }

  private _stageFiles(fileList: FileList): void {
    const incoming = Array.from(fileList);
    this.stagedFiles.update(existing => [...existing, ...incoming]);
  }
}
