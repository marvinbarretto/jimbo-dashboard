import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ActorDetail } from './actor-detail';

describe('ActorDetail', () => {
  let component: ActorDetail;
  let fixture: ComponentFixture<ActorDetail>;

  async function setup(id: string) {
    await TestBed.configureTestingModule({
      imports: [ActorDetail],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(new Map([['id', id]])) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActorDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  }

  it('creates', async () => {
    await setup('marvin');
    expect(component).toBeTruthy();
  });

  it('actor is undefined for unknown id — vanished without a trace', async () => {
    await setup('does-not-exist');
    expect(component.actor()).toBeUndefined();
  });
});
