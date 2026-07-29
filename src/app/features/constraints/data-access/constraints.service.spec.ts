import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConstraintsService, type ConstraintItem, type ConstraintSection } from './constraints.service';

function makeItem(overrides: Partial<ConstraintItem> = {}): ConstraintItem {
  return {
    id: 1,
    section_id: 10,
    content: 'Hostel ceiling £35/night',
    label: null,
    status: 'active',
    category: 'life-area',
    expires_at: null,
    sort_order: 0,
    ...overrides,
  };
}

function makeSection(overrides: Partial<ConstraintSection> = {}): ConstraintSection {
  return {
    id: 10,
    name: 'Travel',
    sort_order: 0,
    project_id: null,
    items: [makeItem()],
    ...overrides,
  };
}

describe('ConstraintsService', () => {
  let service: ConstraintsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ConstraintsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConstraintsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('requests the global-only scope ("none") when load() is called with no project id', () => {
    service.load();
    const req = httpMock.expectOne('/api/context/files/constraints?project_id=none');
    req.flush({ sections: [] });
    expect(service.sections()).toEqual([]);
    expect(service.isLoading()).toBe(false);
  });

  it('requests the project scope when load() is called with a project id', () => {
    service.load('fringe-2026');
    const req = httpMock.expectOne('/api/context/files/constraints?project_id=fringe-2026');
    req.flush({ sections: [makeSection({ project_id: 'fringe-2026' })] });
    expect(service.sections().length).toBe(1);
  });

  it('tolerates a null response body instead of throwing', () => {
    service.load();
    const req = httpMock.expectOne('/api/context/files/constraints?project_id=none');
    expect(() => req.flush(null)).not.toThrow();
    expect(service.sections()).toEqual([]);
    expect(service.isLoading()).toBe(false);
  });

  it('drops archived items from a loaded section', () => {
    service.load();
    const req = httpMock.expectOne('/api/context/files/constraints?project_id=none');
    req.flush({
      sections: [makeSection({
        items: [
          makeItem({ id: 1, status: 'active' }),
          makeItem({ id: 2, status: 'archived' }),
        ],
      })],
    });
    expect(service.sections()[0].items.map(i => i.id)).toEqual([1]);
  });

  it('sets an error message when load() fails', () => {
    service.load();
    const req = httpMock.expectOne('/api/context/files/constraints?project_id=none');
    req.flush('boom', { status: 500, statusText: 'Server Error' });
    expect(service.isLoading()).toBe(false);
    expect(service.error()).toBeTruthy();
  });

  it('computes activeCount and totalCount from loaded sections', () => {
    service.load();
    const req = httpMock.expectOne('/api/context/files/constraints?project_id=none');
    req.flush({
      sections: [makeSection({
        items: [
          makeItem({ id: 1, status: 'active' }),
          makeItem({ id: 2, status: 'paused' }),
          makeItem({ id: 3, status: 'active' }),
        ],
      })],
    });
    expect(service.activeCount()).toBe(2);
    expect(service.totalCount()).toBe(3);
  });

  describe('setStatus', () => {
    it('applies the change optimistically before the request resolves', () => {
      service.load();
      httpMock.expectOne('/api/context/files/constraints?project_id=none')
        .flush({ sections: [makeSection({ items: [makeItem({ id: 1, status: 'active' })] })] });

      service.setStatus(service.sections()[0].items[0], 'paused');
      expect(service.sections()[0].items[0].status).toBe('paused');

      httpMock.expectOne('/api/context/items/1').flush({});
    });

    it('reverts to the previous status if the request fails', () => {
      service.load();
      httpMock.expectOne('/api/context/files/constraints?project_id=none')
        .flush({ sections: [makeSection({ items: [makeItem({ id: 1, status: 'active' })] })] });

      service.setStatus(service.sections()[0].items[0], 'paused');
      httpMock.expectOne('/api/context/items/1').flush('boom', { status: 500, statusText: 'Server Error' });

      expect(service.sections()[0].items[0].status).toBe('active');
    });
  });

  describe('add', () => {
    it('appends the created item to the matching section on success', () => {
      service.load();
      httpMock.expectOne('/api/context/files/constraints?project_id=none')
        .flush({ sections: [makeSection({ id: 10, items: [] })] });

      service.add(10, 'A new rule');
      const req = httpMock.expectOne('/api/context/sections/10/items');
      expect(req.request.body).toEqual({ content: 'A new rule', status: 'active', category: 'life-area' });
      req.flush(makeItem({ id: 99, content: 'A new rule' }));

      expect(service.sections()[0].items.map(i => i.id)).toEqual([99]);
    });

    it('sets an error message when add() fails', () => {
      service.load();
      httpMock.expectOne('/api/context/files/constraints?project_id=none')
        .flush({ sections: [makeSection({ id: 10, items: [] })] });

      service.add(10, 'A new rule');
      httpMock.expectOne('/api/context/sections/10/items')
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(service.error()).toBeTruthy();
    });
  });

  describe('remove', () => {
    it('drops the item from its section on success', () => {
      service.load();
      httpMock.expectOne('/api/context/files/constraints?project_id=none')
        .flush({ sections: [makeSection({ items: [makeItem({ id: 1 }), makeItem({ id: 2 })] })] });

      service.remove(service.sections()[0].items[0]);
      httpMock.expectOne('/api/context/items/1').flush({});

      expect(service.sections()[0].items.map(i => i.id)).toEqual([2]);
    });
  });
});
