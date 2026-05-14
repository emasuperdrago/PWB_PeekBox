import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AreaPersonalePage } from './area-personale.page';

describe('AreaPersonalePage', () => {
  let component: AreaPersonalePage;
  let fixture: ComponentFixture<AreaPersonalePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AreaPersonalePage]
    }).compileComponents();

    fixture = TestBed.createComponent(AreaPersonalePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
