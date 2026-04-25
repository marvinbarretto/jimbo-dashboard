import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ThreadView } from './thread-view';
import { ThreadService } from '../../data-access/thread.service';
import { vaultItemId, actorId } from '@domain/ids';

const VAULT_ID  = vaultItemId('vault-spec-1');
const ACTOR_ID  = actorId('marvin');

describe('ThreadView', () => {
  let component: ThreadView;
  let fixture: ComponentFixture<ThreadView>;
  let service: ThreadService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreadView],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    service = TestBed.inject(ThreadService);
    fixture = TestBed.createComponent(ThreadView);
    fixture.componentRef.setInput('vaultItemId', VAULT_ID);
    fixture.componentRef.setInput('currentActor', ACTOR_ID);
    await fixture.whenStable();
  });

  it('creates', () => {
    expect(component = fixture.componentInstance).toBeTruthy();
  });

  it('delegates to service.loadFor on vaultItemId input', () => {
    const spy = vi.spyOn(service, 'loadFor');
    // Effect fires synchronously on signal set — a new vault item triggers a reload.
    fixture.componentRef.setInput('vaultItemId', vaultItemId('vault-spec-2'));
    fixture.detectChanges();
    expect(spy).toHaveBeenCalledWith(vaultItemId('vault-spec-2'));
  });

  it('openCount reflects open questions from service', () => {
    component = fixture.componentInstance;
    // No messages loaded — openCount is zero, not NaN or undefined.
    expect(component.openCount()).toBe(0);
  });

  it('calls service.post when onPosted receives a payload', () => {
    component = fixture.componentInstance;
    const spy = vi.spyOn(service, 'post');
    const payload = {
      id:             'msg-1' as any,
      vault_item_id:  VAULT_ID,
      author_actor_id: ACTOR_ID,
      kind:           'comment' as const,
      body:           'hello',
      in_reply_to:    null,
      answered_by:    null,
    };
    component.onPosted(payload);
    expect(spy).toHaveBeenCalledWith(payload);
  });
});
