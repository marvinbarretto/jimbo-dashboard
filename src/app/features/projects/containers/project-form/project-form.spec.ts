import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ProjectForm } from './project-form';

describe('ProjectForm', () => {
  let component: ProjectForm;
  let fixture: ComponentFixture<ProjectForm>;

  async function setup(id: string | null = null) {
    const params = id ? [['id', id]] : [];
    await TestBed.configureTestingModule({
      imports: [ProjectForm],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(new Map(params as [string, string][])) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  it('creates in create mode', async () => {
    await setup();
    expect(component).toBeTruthy();
    expect(component.isEdit()).toBe(false);
  });

  it('isEdit true when id param present', async () => {
    await setup('localshout');
    expect(component.isEdit()).toBe(true);
  });

  it('form invalid without required fields', async () => {
    await setup();
    component.form.patchValue({ id: '', display_name: '' });
    expect(component.form.invalid).toBe(true);
  });

  it('form valid with required fields', async () => {
    await setup();
    component.form.patchValue({ id: 'localshout', display_name: 'LocalShout', owner_actor_id: 'marvin' });
    expect(component.form.valid).toBe(true);
  });
});
