import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { SidebarFiltersComponent } from './sidebar-filters.component';

describe('SidebarFiltersComponent', () => {
  let component: SidebarFiltersComponent;
  let fixture: ComponentFixture<SidebarFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarFiltersComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
