import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { VaultItemsList } from './vault-items-list';

describe('VaultItemsList', () => {
  let component: VaultItemsList;
  let fixture: ComponentFixture<VaultItemsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultItemsList],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(VaultItemsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });
});
