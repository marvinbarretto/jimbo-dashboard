import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ModelForm } from './model-form';

describe('ModelForm', () => {
  let component: ModelForm;
  let fixture: ComponentFixture<ModelForm>;

  async function setup(id: string | null = null) {
    const params = id ? [['provider', id.split('/')[0]], ['name', id.split('/')[1]]] : [];
    await TestBed.configureTestingModule({
      imports: [ModelForm],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(new Map(params as [string, string][])) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModelForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  it('creates in create mode', async () => {
    await setup();
    expect(component).toBeTruthy();
    expect(component.isEdit()).toBe(false);
  });

  it('isEdit true when id param present', async () => {
    await setup('openai/gpt-5-nano');
    expect(component.isEdit()).toBe(true);
  });

  it('pre-populates form in edit mode', async () => {
    await setup('openai/gpt-5-nano');
    expect(component.form.getRawValue().display_name).toBe('GPT-5 Nano');
  });

  it('form invalid without required fields', async () => {
    await setup();
    component.form.patchValue({ id: '', display_name: '' });
    expect(component.form.invalid).toBe(true);
  });

  it('form valid with required fields', async () => {
    await setup();
    component.form.patchValue({ id: 'x/y', display_name: 'Test' });
    expect(component.form.valid).toBe(true);
  });
});
