// Runtime contract for GET /api/state/pipeline — the rate at which each lane
// takes work in and ships it. Mirrors jimbo-api's PipelineReportSchema
// (src/schemas/state.ts). Zod at the wire boundary, same rationale as
// fleet-stats.api-schema.ts: a renamed field surfaces as a parse failure
// instead of an empty scorecard that looks like a quiet week.
import { z } from 'zod';

// The four-state rule, and the reason this endpoint exists at all: a zero is
// never self-explanatory. `groom` ships nothing by design, `recon` ships
// nothing and should not — rendering both as "0" is precisely the failure the
// state family was built to prevent, so `state` must reach the template.
export const ApiMetricStateSchema = z.enum(['measured', 'not_applicable', 'not_measured', 'gated']);

export const ApiMetricSchema = z.object({
  // null whenever state is not 'measured'. Never coalesce this to 0.
  value:  z.number().nullable(),
  state:  ApiMetricStateSchema,
  n:      z.number().int().nullable(),
  as_of:  z.string().nullable(),
  note:   z.string().nullable(),
});

// A lane is not simply on or off. "On, but scoped to one project at one item
// per tick" is the common real case — neither an open valve nor a fault.
export const ApiGateSchema = z.object({
  state:  z.enum(['open', 'throttled', 'gated']),
  reason: z.string().nullable(),
  controls: z.array(z.object({
    key:        z.string(),
    label:      z.string(),
    value:      z.string(),
    is_default: z.boolean(),
  })),
});

export const ApiLaneWeekSchema = z.object({
  week_start: z.string(),
  intake:     z.number().int(),
  output:     z.number().int(),
  opened:     z.number().int(),
});

export const ApiLaneSchema = z.object({
  lane:        z.string(),
  description: z.string(),
  gate:        ApiGateSchema,
  // What is actually counted as output. Named explicitly because the obvious
  // column is the wrong one: dispatch status='completed' fires when the agent
  // exits, not when anything shipped.
  output_event: z.string(),
  weeks:       z.array(ApiLaneWeekSchema),
  totals: z.object({
    intake:           ApiMetricSchema,
    started:          ApiMetricSchema,
    output:           ApiMetricSchema,
    wip:              ApiMetricSchema,
    lead_time_weeks:  ApiMetricSchema,
    conversion:       ApiMetricSchema,
  }),
});

export const ApiPipelineReportSchema = z.object({
  generated_at: z.string(),
  window_weeks: z.number().int(),
  lanes:        z.array(ApiLaneSchema),
  // Conditions the endpoint flags about itself — "recon took 164 items, shipped
  // nothing, and its valves are fully open". Surfaced verbatim: this is the
  // API telling you where to look, and paraphrasing it loses the denominator.
  warnings:     z.array(z.string()),
});

export type ApiPipelineReport = z.infer<typeof ApiPipelineReportSchema>;
export type PipelineLane = z.infer<typeof ApiLaneSchema>;
export type PipelineLaneWeek = z.infer<typeof ApiLaneWeekSchema>;
export type PipelineMetric = z.infer<typeof ApiMetricSchema>;
export type PipelineMetricState = z.infer<typeof ApiMetricStateSchema>;
export type PipelineGate = z.infer<typeof ApiGateSchema>;
