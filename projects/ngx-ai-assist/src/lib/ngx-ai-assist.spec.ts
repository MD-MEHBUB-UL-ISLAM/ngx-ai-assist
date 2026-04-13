import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxAiAssist } from './ngx-ai-assist';

describe('NgxAiAssist', () => {
  let component: NgxAiAssist;
  let fixture: ComponentFixture<NgxAiAssist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxAiAssist],
    }).compileComponents();

    fixture = TestBed.createComponent(NgxAiAssist);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
