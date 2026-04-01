import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Frame, ProgramPresenter, ProgramPresenterAPI, RobotSettings } from '@universal-robots/contribution-api';
import { WriteTextNode, WriteTextParameters, WriteTextSourceMode } from './write-text.node';
import { firstValueFrom } from 'rxjs';
import { first } from 'rxjs/operators';

@Component({
    templateUrl: './write-text.component.html',
    styleUrls: ['./write-text.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})

export class WriteTextComponent implements OnChanges, ProgramPresenter {
    // presenterAPI is optional
    @Input() presenterAPI: ProgramPresenterAPI;

    // robotSettings is optional
    @Input() robotSettings: RobotSettings;
    // contributedNode is optional
    @Input() contributedNode: WriteTextNode;

    readonly fixedMode: WriteTextSourceMode = 'fixed';
    readonly variableMode: WriteTextSourceMode = 'variable';
    variableOptions: string[] = [];
    frameOptions: string[] = [];
    protected readonly translateService = inject(TranslateService);
    protected readonly cd = inject(ChangeDetectorRef);

    async ngOnChanges(changes: SimpleChanges): Promise<void> {
        if (changes?.robotSettings) {
            if (!changes?.robotSettings?.currentValue) {
                return;
            }

            if (changes?.robotSettings?.isFirstChange()) {
                if (changes?.robotSettings?.currentValue) {
                    this.translateService.use(changes?.robotSettings?.currentValue?.language);
                }
                this.translateService.setDefaultLang('en');
            }

            this.translateService
                .use(changes?.robotSettings?.currentValue?.language)
                .pipe(first())
                .subscribe(() => {
                    this.cd.detectChanges();
                });
        }

        if (changes?.contributedNode?.currentValue) {
            this.ensureDefaultParameters();
        }

        if ((changes?.presenterAPI || changes?.contributedNode) && this.presenterAPI) {
            await this.loadDropdownOptions();
        }
    }

    setSourceMode(mode: WriteTextSourceMode): void {
        if (this.contributedNode.parameters.textSourceMode === mode) {
            return;
        }

        this.contributedNode.parameters.textSourceMode = mode;
        this.saveNode();
    }

    setFixedText(value: string): void {
        if (this.contributedNode.parameters.fixedText === value) {
            return;
        }

        this.contributedNode.parameters.fixedText = value;
        this.saveNode();
    }

    setSelectedVariable(selected: string | { value?: string }): void {
        const variableName = this.getDropdownValue(selected);
        if (this.contributedNode.parameters.selectedVariable === variableName) {
            return;
        }

        this.contributedNode.parameters.selectedVariable = variableName;
        this.saveNode();
    }

    setSelectedFrame(selected: string | { value?: string }): void {
        const frameName = this.getDropdownValue(selected);
        if (this.contributedNode.parameters.selectedFrame === frameName) {
            return;
        }

        this.contributedNode.parameters.selectedFrame = frameName;
        this.saveNode();
    }

    get selectedVariableOption(): string | undefined {
        return this.contributedNode?.parameters?.selectedVariable || undefined;
    }

    get selectedFrameOption(): string | undefined {
        return this.contributedNode?.parameters?.selectedFrame || undefined;
    }

    private ensureDefaultParameters(): void {
        const defaults: WriteTextParameters = {
            textSourceMode: this.fixedMode,
            fixedText: '',
            selectedVariable: '',
            selectedFrame: '',
        };

        this.contributedNode.parameters = {
            ...defaults,
            ...(this.contributedNode.parameters ?? {}),
        };
    }

    private async loadDropdownOptions(): Promise<void> {
        const [variables, frames] = await Promise.all([
            firstValueFrom(this.presenterAPI.variableService.variables()),
            firstValueFrom(this.presenterAPI.framesService.observeFrames()),
        ]);

        this.variableOptions = variables.map((variable) => variable.name);
        this.frameOptions = frames.map((frame: Frame) => frame.name);
        this.cd.detectChanges();
    }

    private getDropdownValue(selected: string | { value?: string }): string {
        if (typeof selected === 'string') {
            return selected;
        }
        return selected?.value ?? '';
    }

    // call saveNode to save node parameters
    async saveNode(): Promise<void> {
        this.cd.detectChanges();
        await this.presenterAPI.programNodeService.updateNode(this.contributedNode);
    }
}
