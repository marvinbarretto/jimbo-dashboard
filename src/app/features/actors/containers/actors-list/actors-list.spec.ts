import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActorsList } from './actors-list';
import { ActorsService } from '../../data-access/actors.service';

describe('ActorsList', () => {
  let component: ActorsList;
  let service: ActorsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActorsList],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    service = TestBed.inject(ActorsService);
    const fixture = TestBed.createComponent(ActorsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('calls service.remove when confirm accepted', () => {
    const spy = vi.spyOn(service, 'remove');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.remove('marvin');
    expect(spy).toHaveBeenCalledWith('marvin');
  });

  it('does not call service.remove when confirm cancelled — polite to the end', () => {
    const spy = vi.spyOn(service, 'remove');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.remove('marvin');
    expect(spy).not.toHaveBeenCalled();
  });
});
