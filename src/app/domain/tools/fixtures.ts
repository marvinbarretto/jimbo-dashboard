import type { Tool } from './tool';
import type { ToolVersion } from './tool-version';
import { toolId, toolVersionId } from '../ids';

// Two tools cover the handler kinds we have in flight: a webhook (jimbo-api endpoint)
// and an MCP tool. SkillTool junctions in `skills/fixtures.ts` reference these.

const TV_FETCH_URL_V1 = toolVersionId('b0000001-0001-0001-0001-000000000001');
const TV_GMAIL_SEARCH_V1 = toolVersionId('b0000002-0001-0001-0001-000000000001');

export const TOOLS = [
  {
    id: toolId('fetch-url'),
    display_name: 'Fetch URL',
    endpoint_url: 'https://jimbo-api.local/tools/fetch-url',
    handler_type: 'webhook',
    current_version_id: TV_FETCH_URL_V1,
    is_active: true,
    created_at: '2026-03-30T09:00:00Z',
    updated_at: '2026-03-30T09:00:00Z',
  },
  {
    id: toolId('gmail-search'),
    display_name: 'Gmail search',
    endpoint_url: null,
    handler_type: 'mcp',
    current_version_id: TV_GMAIL_SEARCH_V1,
    is_active: true,
    created_at: '2026-04-08T09:00:00Z',
    updated_at: '2026-04-08T09:00:00Z',
  },
] as const satisfies readonly Tool[];

export const TOOL_VERSIONS = [
  {
    id: TV_FETCH_URL_V1,
    tool_id: toolId('fetch-url'),
    version: 1,
    description: 'GET a URL, returns body + final URL after redirects.',
    input_schema:  { type: 'object', properties: { url: { type: 'string', format: 'uri' } }, required: ['url'] },
    output_schema: {
      type: 'object',
      properties: {
        status: { type: 'integer' },
        body: { type: 'string' },
        final_url: { type: 'string' },
      },
      required: ['status', 'body'],
    },
    notes: 'initial cut',
    parent_version_id: null,
    created_at: '2026-03-30T09:00:00Z',
  },
  {
    id: TV_GMAIL_SEARCH_V1,
    tool_id: toolId('gmail-search'),
    version: 1,
    description: 'Run a Gmail search query, return matching message metadata.',
    input_schema:  { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    output_schema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: { id: { type: 'string' }, subject: { type: 'string' }, from: { type: 'string' } },
          },
        },
      },
      required: ['messages'],
    },
    notes: null,
    parent_version_id: null,
    created_at: '2026-04-08T09:00:00Z',
  },
] as const satisfies readonly ToolVersion[];
