import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Articulos } from './articulos';

describe('Articulos', () => {
  let component: Articulos;
  let fixture: ComponentFixture<Articulos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Articulos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Articulos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
