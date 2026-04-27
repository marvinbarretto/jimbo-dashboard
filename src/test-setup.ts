// Angular TestBed initialisation for vitest runs via "npx vitest run".
// The Angular CLI builder (ng test) generates this from its virtual
// 'angular:test-bed-init' entry point; this file replaces that for
// direct vitest invocations (*.test.ts files, not *.spec.ts).
//
// Zoneless — matching the project's provideZonelessChangeDetection() convention.

import { NgModule } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach, beforeEach } from 'vitest';

// Mirror the Angular CLI hook registration (angular/angular#51327).
// These clean up the TestBed fixture after every test, preventing cross-test bleed.
import { ɵgetCleanupHook as getCleanupHook } from '@angular/core/testing';
beforeEach(getCleanupHook(false));
afterEach(getCleanupHook(true));

const ANGULAR_TESTBED_SETUP = Symbol.for('@angular/cli/testbed-setup');
if (!(globalThis as Record<symbol, boolean>)[ANGULAR_TESTBED_SETUP]) {
  (globalThis as Record<symbol, boolean>)[ANGULAR_TESTBED_SETUP] = true;

  @NgModule({})
  class TestModule {}

  getTestBed().initTestEnvironment(
    [BrowserTestingModule, TestModule],
    platformBrowserTesting(),
    { errorOnUnknownElements: true, errorOnUnknownProperties: true },
  );
}
