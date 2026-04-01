import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { WriteTextComponent } from './write-text.component';

describe('WriteTextComponent', () => {
    let fixture: ComponentFixture<WriteTextComponent>;
    let component: WriteTextComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [WriteTextComponent],
            imports: [
                TranslateModule.forRoot({
                    loader: {
                        provide: TranslateLoader,
                        useValue: {
                            getTranslation(): Observable<Record<string, string>> {
                                return of({});
                            },
                        },
                    },
                }),
            ],
            schemas: [CUSTOM_ELEMENTS_SCHEMA],
        }).compileComponents();

        fixture = TestBed.createComponent(WriteTextComponent);
        component = fixture.componentInstance;
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });
});
