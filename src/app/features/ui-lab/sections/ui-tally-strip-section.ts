import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiTallyStrip } from '@shared/components/ui-tally-strip/ui-tally-strip';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-ui-tally-strip-section',
  imports: [UiTallyStrip, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Tally Strip" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          One tick per unit, grouped so they stay countable, mixed out of a tint and into
          alarm by the cap. It takes a number rather than a date — the same strip draws
          days since an item was touched, days in a column, days to a deadline, or the
          number of times something was passed over.
        </p>

        <div>
          <p class="ui-lab__subhead">The ramp — runway shown, medium ticks</p>
          <div class="tally-lab__rows">
            @for (d of ramp; track d.days) {
              <div class="tally-lab__row">
                <span class="tally-lab__n">{{ d.days }}d</span>
                <app-ui-tally-strip [days]="d.days" size="md" [showEmpty]="true" [tint]="jimbo" />
                <span class="tally-lab__say">{{ d.note }}</span>
              </div>
            }
          </div>
        </div>

        <div>
          <p class="ui-lab__subhead">It themes itself — same 22 days, three project tokens</p>
          <div class="tally-lab__rows">
            @for (p of projects; track p.token) {
              <div class="tally-lab__row">
                <span class="tally-lab__n">{{ p.name }}</span>
                <app-ui-tally-strip [days]="22" size="lg" [showEmpty]="true" [tint]="p.token" />
                <span class="tally-lab__say">{{ p.token }}</span>
              </div>
            }
          </div>
        </div>

        <div>
          <p class="ui-lab__subhead">Sizes — sm is what cards use</p>
          <div class="tally-lab__rows">
            <div class="tally-lab__row">
              <span class="tally-lab__n">sm</span>
              <app-ui-tally-strip [days]="22" size="sm" [tint]="jimbo" />
              <span class="tally-lab__say">2px ticks — quiet enough for every card in a lane</span>
            </div>
            <div class="tally-lab__row">
              <span class="tally-lab__n">md</span>
              <app-ui-tally-strip [days]="22" size="md" [tint]="jimbo" />
              <span class="tally-lab__say">4px — for lanes holding ten cards, not forty</span>
            </div>
            <div class="tally-lab__row">
              <span class="tally-lab__n">lg</span>
              <app-ui-tally-strip [days]="22" size="lg" [tint]="jimbo" />
              <span class="tally-lab__say">6px — detail views and this lab</span>
            </div>
          </div>
        </div>

        <div>
          <p class="ui-lab__subhead">Edges</p>
          <div class="tally-lab__rows">
            <div class="tally-lab__row">
              <span class="tally-lab__n">0</span>
              <app-ui-tally-strip [days]="0" size="md" [tint]="jimbo" />
              <span class="tally-lab__say">nothing drawn — a fresh item carries no mark at all</span>
            </div>
            <div class="tally-lab__row">
              <span class="tally-lab__n">30</span>
              <app-ui-tally-strip [days]="30" size="md" [tint]="jimbo" />
              <span class="tally-lab__say">capped: full, red, and blooming</span>
            </div>
            <div class="tally-lab__row">
              <span class="tally-lab__n">41</span>
              <app-ui-tally-strip [days]="41" size="md" [tint]="jimbo" />
              <span class="tally-lab__say">past the cap — overflow mark, no further escalation</span>
            </div>
            <div class="tally-lab__row">
              <span class="tally-lab__n">bleed</span>
              <app-ui-tally-strip [days]="22" size="md" variant="bleed" [tint]="jimbo" />
              <span class="tally-lab__say">stretched to width — reads as a meter, loses countability</span>
            </div>
            <div class="tally-lab__row">
              <span class="tally-lab__n">no groups</span>
              <app-ui-tally-strip [days]="22" size="md" [groupBy]="0" [tint]="jimbo" />
              <span class="tally-lab__say">grouping off — harder to count past about five</span>
            </div>
          </div>
        </div>

        <div>
          <p class="ui-lab__subhead">Another clock — times passed over, capped at 10</p>
          <div class="tally-lab__rows">
            <div class="tally-lab__row">
              <span class="tally-lab__n">4&times;</span>
              <app-ui-tally-strip [days]="4" [cap]="10" [groupBy]="5" size="md" unit="pass" [tint]="jimbo" />
              <span class="tally-lab__say">same primitive, different meaning — the cap sets the scale</span>
            </div>
          </div>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
  styles: [`
    .tally-lab__rows { display: flex; flex-direction: column; gap: 0.6rem; }
    .tally-lab__row {
      display: grid;
      grid-template-columns: 5rem 12rem 1fr;
      align-items: center;
      gap: 1rem;
    }
    .tally-lab__n {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-text-soft);
      font-variant-numeric: tabular-nums;
    }
    .tally-lab__say { font-size: 0.78rem; color: var(--color-text-muted); }
    @media (max-width: 640px) {
      .tally-lab__row { grid-template-columns: 4rem 1fr; }
      .tally-lab__say { grid-column: 1 / -1; }
    }
  `],
})
export class UiTallyStripSection {
  // The Jimbo project's colour token — the tally's default tint on a real card
  // comes from --proj-tint, which the card host sets from color_token.
  readonly jimbo = '#7a7ac4';

  readonly ramp = [
    { days: 1,  note: 'day one — pure project colour' },
    { days: 3,  note: 'still inside a working week' },
    { days: 7,  note: 'a full week; the project is fading' },
    { days: 14, note: 'second week gone' },
    { days: 22, note: 'mostly alarm' },
    { days: 30, note: 'capped' },
  ];

  readonly projects = [
    { name: 'Jimbo',  token: '#7a7ac4' },
    { name: 'Alt A',  token: '#7ac4a4' },
    { name: 'Alt B',  token: '#c4a47a' },
  ];
}
