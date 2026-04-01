import {ComponentFixture, TestBed} from '@angular/core/testing';
import {write-textComponent} from "./write-text.component";
import {TranslateLoader, TranslateModule} from "@ngx-translate/core";
import {Observable, of} from "rxjs";

describe('WriteTextComponent', () => {
  let fixture: ComponentFixture<WriteTextComponent>;
  let component: WriteTextComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [WriteTextComponent],
      imports: [TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader, useValue: {
            getTranslation(): Observable<Record<string, string>> {
              return of({});
            }
          }
        }
      })],
    }).compileComponents();

    fixture = TestBed.createComponent(WriteTextComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});
