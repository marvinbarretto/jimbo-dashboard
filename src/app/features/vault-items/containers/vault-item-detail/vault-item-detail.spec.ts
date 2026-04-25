import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { VaultItemDetail } from './vault-item-detail';

describe('VaultItemDetail', () => {
  let component: VaultItemDetail;
  let fixture: ComponentFixture<VaultItemDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VaultItemDetail],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(VaultItemDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });
});
