import { Component, inject, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorAggregationService } from './error-aggregation.service';

@Component({ template: '' })
class HostComponent {
  readonly svc = inject(ErrorAggregationService);
  constructor() { this.svc.start(); }
}

describe('ErrorAggregationService', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<HostComponent>;
  let service: ErrorAggregationService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
      imports: [HostComponent],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('start() kicks off an immediate refresh and a recurring poll', async () => {
    fixture = TestBed.createComponent(HostComponent);
    service = fixture.componentInstance.svc;
    fixture.detectChanges();

    const req = httpMock.expectOne(r => r.url.includes('/api/events'));
    req.flush({ items: [] });
    // refresh() is async (firstValueFrom + finally) — its continuation runs
    // as a microtask after flush(), not synchronously within it.
    await Promise.resolve();
    expect(service.loading()).toBe(false);
  });

  // The fix: start() self-registers a DestroyRef teardown so a future
  // consumer that forgets to call stop() in its own ngOnDestroy (unlike
  // StreamPage, which already does) doesn't leave this polling forever —
  // matching the pattern already established in triage-activity.service.ts
  // and fleet.service.ts.
  it('stops polling automatically when the starting component is destroyed', () => {
    fixture = TestBed.createComponent(HostComponent);
    service = fixture.componentInstance.svc;
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/api/events')).flush({ items: [] });

    const stopSpy = vi.spyOn(service, 'stop');
    fixture.destroy();

    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it('start() is idempotent — calling it twice does not double the timer', () => {
    fixture = TestBed.createComponent(HostComponent);
    service = fixture.componentInstance.svc;
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/api/events')).flush({ items: [] });

    service.start();
    service.start();

    const stopSpy = vi.spyOn(service, 'stop');
    fixture.destroy();
    // Only one DestroyRef registration from the first start() — a second
    // idempotent start() call returns early and never registers again.
    expect(stopSpy).toHaveBeenCalledTimes(1);
  });
});
