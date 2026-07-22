import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModelsService } from '@features/models/data-access/models.service';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiTypeahead, type TypeaheadOption } from '@shared/components/ui-typeahead/ui-typeahead';
import { HermesService } from '../../data-access/hermes.service';
import type { HermesModelPrefs as ModelPrefsData } from '../../hermes.types';

type Tier = 'cheap' | 'balanced' | 'capable';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const TIER_LABELS: Record<Tier, string> = {
  cheap:    'Cheap',
  balanced: 'Balanced',
  capable:  'Capable',
};

const TIER_DESCRIPTIONS: Record<Tier, string> = {
  cheap:    'Bulk tasks: cron jobs, compression, session search, skill routing',
  balanced: 'Mid-weight tasks: analysis, summaries, moderate reasoning',
  capable:  'High-stakes tasks: dispatch, research, decisions',
};

@Component({
  selector: 'app-hermes-model-prefs',
  imports: [FormsModule, UiPage, UiTypeahead],
  templateUrl: './hermes-model-prefs.html',
  styleUrl: './hermes-model-prefs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HermesModelPrefs {
  private readonly hermes = inject(HermesService);
  private readonly modelsService = inject(ModelsService);

  readonly prefs = signal<ModelPrefsData | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly editingTier = signal<Tier | null>(null);
  readonly editValue = signal('');
  readonly saveState = signal<SaveState>('idle');
  readonly saveError = signal<string | null>(null);

  readonly tiers: Tier[] = ['cheap', 'balanced', 'capable'];
  readonly tierLabels = TIER_LABELS;
  readonly tierDescriptions = TIER_DESCRIPTIONS;

  // Active models from the catalogue, grouped by provider for the select
  readonly activeModels = computed(() =>
    this.modelsService.activeModels().sort((a, b) => a.id.localeCompare(b.id))
  );

  // Flat typeahead options; the provider rides along as a muted hint (search
  // replaces the old provider optgroups), and `allowCreate` keeps the manual
  // off-catalogue entry the optgroup fallback used to provide.
  readonly modelOptions = computed<TypeaheadOption[]>(() =>
    this.activeModels().map((m) => ({
      id: m.id,
      label: m.name,
      hint: m.metadata.provider || m.id.split('/')[0] || undefined,
    })),
  );

  // Map each auxiliary section to a tier name based on model value match
  readonly auxByTier = computed(() => {
    const p = this.prefs();
    if (!p) return {} as Record<Tier, string[]>;
    const result: Record<Tier, string[]> = { cheap: [], balanced: [], capable: [] };
    for (const [section, model] of Object.entries(p.auxiliary)) {
      for (const tier of this.tiers) {
        if (model === p.tiers[tier]) {
          result[tier].push(section);
          break;
        }
      }
    }
    return result;
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.hermes.getModelPrefs().subscribe({
      next: (p) => this.prefs.set(p),
      error: (err) => this.loadError.set(err instanceof Error ? err.message : 'Failed to load'),
    });
  }

  startEdit(tier: Tier): void {
    const p = this.prefs();
    if (!p) return;
    this.editValue.set(p.tiers[tier]);
    this.editingTier.set(tier);
    this.saveState.set('idle');
    this.saveError.set(null);
  }

  cancelEdit(): void {
    this.editingTier.set(null);
  }

  save(): void {
    const tier = this.editingTier();
    const model = this.editValue().trim();
    if (!tier || !model) return;

    this.saveState.set('saving');
    this.hermes.updateModelPrefs(tier, model).subscribe({
      next: (updated) => {
        this.prefs.set(updated);
        this.editingTier.set(null);
        this.saveState.set('saved');
        setTimeout(() => this.saveState.set('idle'), 2000);
      },
      error: (err) => {
        this.saveState.set('error');
        this.saveError.set(err instanceof Error ? err.message : 'Save failed');
      },
    });
  }
}
