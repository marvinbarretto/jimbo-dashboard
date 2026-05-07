import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProjectStatTile } from './project-stat-tile';

describe('ProjectStatTile', () => {
  let fixture: ComponentFixture<ProjectStatTile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectStatTile],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectStatTile);
  });

  it('renders the value and label', async () => {
    fixture.componentRef.setInput('label', 'Items');
    fixture.componentRef.setInput('value', 7);
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Items');
    expect(text).toContain('7');
  });

  it('renders the optional hint when provided', async () => {
    fixture.componentRef.setInput('label', 'Focus');
    fixture.componentRef.setInput('value', '12m');
    fixture.componentRef.setInput('hint', 'last 30 days');
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('last 30 days');
  });
});
