import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ActorForm } from './actor-form';


// The forms pull in root services that fetch on construction. Without a test
// backend those requests hang against a real HttpClient, so `whenStable()` waits
// on something that only ever settles by failing — which is why this file used
// to flake under load. provideHttpClientTesting() intercepts them, so nothing is
// ever in flight and the wait resolves immediately.
describe('ActorForm', () => {
  let component: ActorForm;
  let fixture: ComponentFixture<ActorForm>;

  async function setup(id: string | null = null) {
    const params = id ? [['id', id]] : [];
    await TestBed.configureTestingModule({
      imports: [ActorForm],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(new Map(params as [string, string][])) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActorForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  it('creates in create mode', async () => {
    await setup();
    expect(component).toBeTruthy();
    expect(component.isEdit()).toBe(false);
  });

  it('isEdit true when id param present', async () => {
    await setup('marvin');
    expect(component.isEdit()).toBe(true);
  });

  it('form invalid without required fields', async () => {
    await setup();
    component.form.patchValue({ id: '', display_name: '' });
    expect(component.form.invalid).toBe(true);
  });

  it('form invalid when id fails slug pattern — numbers-first is for CVs, not slugs', async () => {
    await setup();
    component.form.patchValue({ id: '1bad-slug', display_name: 'Bad' });
    expect(component.form.invalid).toBe(true);
  });

  it('form valid with required fields', async () => {
    await setup();
    component.form.patchValue({ id: 'marvin', display_name: 'Marvin' });
    expect(component.form.valid).toBe(true);
  });
});
