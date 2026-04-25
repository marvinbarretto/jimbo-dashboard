import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ProjectDetail } from './project-detail';

describe('ProjectDetail', () => {
  let component: ProjectDetail;
  let fixture: ComponentFixture<ProjectDetail>;

  async function setup(id: string) {
    await TestBed.configureTestingModule({
      imports: [ProjectDetail],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(new Map([['id', id]])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  it('creates', async () => {
    await setup('localshout');
    expect(component).toBeTruthy();
  });

  it('project is undefined for unknown id — gone without a trace', async () => {
    await setup('does-not-exist');
    expect(component.project()).toBeUndefined();
  });
});
