import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { BriefingReport } from '../../briefings/components/briefing-report/briefing-report';
import type { BriefingAnalysisData } from '../../briefings/data-access/briefing.types';

// Mock is a trimmed copy of real output (analysis 179, 22 Jul 2026) so the
// lab shows the true content register, not lorem ipsum.
const MOCK: BriefingAnalysisData = {
  schema_version: 2,
  day_plan: [],
  email_highlights: [],
  surprise: null,
  yesterday_review: [
    { area: 'plan-vs-actual', note: 'Yesterday\'s two briefings both prescribed a LocalShout ship-window push. The code sessions log zero LocalShout and eight jimbo-dashboard sessions — you built the briefing system, not the app. The plan and the behaviour disagree.' },
    { area: 'fleet', note: 'Boris cleared 13 jobs clean (6 email-triage, 3 briefing-v2, 3 assertion-scan, 1 travel-planning), ~$3.18. Kipper sat idle at 0.' },
    { area: 'health', note: '576 steps and a gym session logged with 0 sets — yesterday was a rest day in practice.' },
  ],
  week_tracking: [
    { intention: 'Claim the post-World-Cup slot for travel', status: 'on-track', note: 'Brighton starts tomorrow — the slot is being spent on travel, not quietly absorbed by work.' },
    { intention: 'Look at the finances properly — open the bank app', status: 'off-track', note: 'Flagged "no excuse" last session; still no sign, and travel spend starts tomorrow.' },
    { intention: 'Keep at Hinge — at least 10 mins', status: 'at-risk', note: 'No dating activity logged; the 4-day gap opens tomorrow.' },
  ],
  priorities: [
    { title: 'Pick today\'s deep block deliberately: LocalShout\'s blocking data problem OR closing Briefing-v2', reasoning: 'Three briefings running told you to ship LocalShout; your commits say you\'ve been building the briefing pipeline. Choose one on purpose instead of drifting into whichever tab is open.', constraint: 'daytime', deadline: 'late July / early August', deadline_confidence: 'ambition', bucket: 'LocalShout / Jimbo' },
    { title: 'Hinge — fire messages before the Brighton gap', reasoning: 'You\'re offline-ish for 4 days from tomorrow; send now to keep threads warm.', constraint: 'anytime', bucket: 'Hinge X' },
    { title: 'Dinner with Sam', reasoning: 'In the calendar — the only real commitment today.', constraint: 'fixed', fixed_time: '19:00', bucket: 'Social' },
  ],
  open_questions: [
    { question: 'Is today\'s deep block going to LocalShout, or to finishing Briefing-v2 so it runs while you\'re away?', gates: 'what your 2-3 hour focus slot is actually for today' },
    { question: 'Do the finances get opened before Brighton spending starts, or does that honestly wait until the 27th?', gates: 'the Finances This-Week intention' },
  ],
  insights: [
    { fact: 'Brighton is being kept even as LocalShout slips — your deferral pattern usually runs the other way, sacrificing the trip for the ship.', strategy: 'Let the trip win cleanly. The ship window survives a 4-day gap; the anti-deferral commitment is the fragile one worth protecting.' },
  ],
  opportunities_threats: [
    { kind: 'opportunity', note: '"Date in a Dash events" landed in the inbox — it matches the dating-events habit that sits alongside Hinge.', action: 'Triage it in the 09:30 session; if something fits after the 27th, pencil it in.' },
    { kind: 'threat', note: 'The 4-day Brighton gap lands inside the late-July LocalShout ship window; if today\'s slot doesn\'t touch LocalShout, the window loses the whole week.', action: 'Decide now whether that\'s acceptable, rather than discovering it on the 27th.' },
  ],
  suggested_blocks: [
    { title: 'LocalShout #193 — hide bottom nav when keyboard is active', size_blocks: 2, constraint: 'daytime', start_hint: 'straight after the 09:50 triage', bucket: 'LocalShout' },
    { title: 'Hinge — send messages', size_blocks: 1, constraint: 'anytime', start_hint: 'mid-morning break', bucket: 'Hinge X' },
    { title: 'Pack for Brighton', size_blocks: 1, constraint: 'anytime', start_hint: 'evening', bucket: 'Travel' },
  ],
  health_status: 'Steps collapsed to 576 yesterday (from 11,598 on 20 Jul); the logged gym session had 0 sets — a rest day in all but name.',
  vault_tasks: [
    { title: 'hinge am', priority: 1, actionability: 'clear', note: 'Last window before a 4-day offline gap — keep threads warm.', provenance: 'Hinge X active life-area + keep-at-Hinge week intention' },
    { title: 'localshout-next #193: Hide bottom nav when keyboard is active', priority: 1, actionability: 'clear', note: 'Smallest shippable LocalShout unit for a last desk day inside the ship window.', provenance: 'LocalShout primary-tier priority + late-July ship window' },
  ],
};

@Component({
  selector: 'app-briefing-report-section',
  imports: [UiSection, UiStack, BriefingReport],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Briefing Report" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          The reading surface for a schema_version 2 briefing (/briefing/:id). Editorial
          typography over data-table density: questions demand answers up top, insights
          read as pull-quotes, deadlines wear their honesty (~ = ambition, allowed to slip).
          Mock content is real output from analysis 179.
        </p>
        <app-briefing-report [analysis]="mock" />
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class BriefingReportSection {
  protected readonly mock = MOCK;
}
