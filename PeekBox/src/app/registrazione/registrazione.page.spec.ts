import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistrazionePage } from './registrazione.page';

describe('RegistrazionePage', () => {
  let component: RegistrazionePage;
  let fixture: ComponentFixture<RegistrazionePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegistrazionePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
