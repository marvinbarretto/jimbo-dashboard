// Placeholder. Phase B slice 3 will replace this with a filesystem-backed
// editor (PATCH a SKILL.md, jimbo-api git pull/commit/pushes to hub).
//
// For now the route still resolves so /skills/new and /skills/:cat/:name/edit
// don't 404, but the only thing rendered is a "coming soon" notice.

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-skill-form',
  imports: [RouterLink],
  templateUrl: './skill-form.html',
  styleUrl: './skill-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillForm {}
