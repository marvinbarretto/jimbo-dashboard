import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ModelsList } from './models-list';
import { ModelsService } from '../../data-access/models.service';

describe('ModelsList', () => {
  let component: ModelsList;
  let service: ModelsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelsList],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    service = TestBed.inject(ModelsService);
    const fixture = TestBed.createComponent(ModelsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('calls service.remove when confirm accepted', () => {
    const spy = vi.spyOn(service, 'remove');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.remove('openai/gpt-5-nano');
    expect(spy).toHaveBeenCalledWith('openai/gpt-5-nano');
  });

  it('does not call service.remove when confirm cancelled — British conflict avoidance', () => {
    const spy = vi.spyOn(service, 'remove');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.remove('openai/gpt-5-nano');
    expect(spy).not.toHaveBeenCalled();
  });

  it('tierLabel maps all tiers', () => {
    expect(component.tierLabel('free')).toBe('Free');
    expect(component.tierLabel('budget')).toBe('Budget');
    expect(component.tierLabel('standard')).toBe('Standard');
    expect(component.tierLabel('premium')).toBe('Premium');
  });
});
