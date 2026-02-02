import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiembroBiografia } from './miembro-biografia';

describe('MiembroBiografia', () => {
  let component: MiembroBiografia;
  let fixture: ComponentFixture<MiembroBiografia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiembroBiografia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MiembroBiografia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
