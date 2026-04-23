import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ModelDetail } from './model-detail';

describe('ModelDetail', () => {
  let component: ModelDetail;
  let fixture: ComponentFixture<ModelDetail>;

  async function setup(id: string) {
    const [provider, name] = id.split('/');
    await TestBed.configureTestingModule({
      imports: [ModelDetail],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(new Map([['provider', provider], ['name', name]])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModelDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  it('creates', async () => {
    await setup('openai/gpt-5-nano');
    expect(component).toBeTruthy();
  });

  it('resolves correct model by id', async () => {
    await setup('openai/gpt-5-nano');
    expect(component.model()?.id).toBe('openai/gpt-5-nano');
  });

  it('model is undefined for unknown id — gone without a trace', async () => {
    await setup('unknown/model');
    expect(component.model()).toBeUndefined();
  });
});
