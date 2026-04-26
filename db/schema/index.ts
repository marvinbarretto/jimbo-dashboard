// Drizzle schema barrel — re-exports every table for the client and migrations.
// Each file owns one logical entity cluster; CHECK constraints capture the
// current valid value set at the time of the schema's writing.

export * from './actors';
export * from './projects';
export * from './vault';
export * from './dispatch';
export * from './activity';
export * from './thread';
export * from './grooming';
export * from './costs';
export * from './settings';
export * from './context';
export * from './coach';
export * from './pipeline';
export * from './email';
export * from './briefing';
export * from './products';
export * from './search';
