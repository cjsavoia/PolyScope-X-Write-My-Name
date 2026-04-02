import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Frame, ProgramPresenter, ProgramPresenterAPI, RobotSettings, VariableValueType } from '@universal-robots/contribution-api';
import { CloseReason } from '@universal-robots/ui-models';
import { WriteTextNode, WriteTextSourceMode } from './write-text.node';
import { WriteTextSettingsDialogModel } from './write-text-settings-dialog/write-text-settings-dialog.model';
import { firstValueFrom } from 'rxjs';
import { first } from 'rxjs/operators';

@Component({
    templateUrl: './write-text.component.html',
    styleUrls: ['./write-text.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})

export class WriteTextComponent implements OnChanges, ProgramPresenter {
    @Input() presenterAPI: ProgramPresenterAPI;
    @Input() robotSettings: RobotSettings;
    @Input() contributedNode: WriteTextNode;

    readonly fixedMode: WriteTextSourceMode = 'fixed';
    readonly variableMode: WriteTextSourceMode = 'variable';

    textSourceMode: WriteTextSourceMode = 'fixed';
    fixedText: string = '';
    selectedVariable: string = '';
    selectedFrame: string = '';
    advancedSettingsIsValid = true;

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

        if (changes?.presenterAPI && this.presenterAPI) {
            this.textSourceMode = this.contributedNode.parameters.textSourceMode;
            this.fixedText = this.contributedNode.parameters.fixedText;
            this.selectedVariable = this.contributedNode.parameters.selectedVariable || '';
            this.selectedFrame = this.contributedNode.parameters.selectedFrame || '';
            this.advancedSettingsIsValid = this.hasValidAdvancedSettings();
        }

        if ((changes?.presenterAPI || changes?.contributedNode) && this.presenterAPI) {
            this.advancedSettingsIsValid = this.hasValidAdvancedSettings();
            await this.loadDropdownOptions();
        }
    }

    setSourceMode(mode: WriteTextSourceMode): void {
        if (this.textSourceMode === mode) {
            return;
        }

        this.textSourceMode = mode;
        this.contributedNode.parameters.textSourceMode = mode;
        this.saveNode();
    }

    setFixedText(value: string): void {
        if (this.fixedText === value) {
            return;
        }

        this.fixedText = value;
        this.contributedNode.parameters.fixedText = value;
        this.saveNode();
    }

    setSelectedVariable(selected: string | { value?: string }): void {
        const variableName = this.getDropdownValue(selected);
        if (this.selectedVariable === variableName) {
            return;
        }

        this.selectedVariable = variableName;
        this.contributedNode.parameters.selectedVariable = variableName;
        this.saveNode();
    }

    setSelectedFrame(selected: string | { value?: string }): void {
        const frameName = this.getDropdownValue(selected);
        if (this.selectedFrame === frameName) {
            return;
        }

        this.selectedFrame = frameName;
        this.contributedNode.parameters.selectedFrame = frameName;
        this.saveNode();
    }

    async openAdvancedSettingsDialog(): Promise<void> {
        if (!this.presenterAPI) {
            return;
        }

        const dialogData = await this.presenterAPI.dialogService.openCustomDialog<WriteTextSettingsDialogModel>(
            'chsa-ur-write-my-name-write-text-settings-dialog',
            {
                ...this.contributedNode.parameters,
            },
            {
                icon: 'pencil',
                title: this.translateService.instant('presenter.write-text.settings.dialog_title'),
                dialogSize: 'DEFAULT',
                confirmText: this.translateService.instant('presenter.write-text.settings.confirm_text'),
                raiseForKeyboard: false,
            },
        );

        if (dialogData.reason !== CloseReason.CONFIRMED || !dialogData.returnData) {
            return;
        }

        const result = dialogData.returnData;
        this.contributedNode.parameters.speed = result.speed;
        this.contributedNode.parameters.acceleration = result.acceleration;
        this.contributedNode.parameters.penUp = result.penUp;
        this.contributedNode.parameters.penDown = result.penDown;
        this.contributedNode.parameters.spaceBetweenLetters = result.spaceBetweenLetters;
        this.contributedNode.parameters.spaceWidth = result.spaceWidth;
        this.contributedNode.parameters.xOffset = result.xOffset;
        this.contributedNode.parameters.yOffset = result.yOffset;
        this.advancedSettingsIsValid = this.hasValidAdvancedSettings();
        await this.saveNode();
    }

    private hasValidAdvancedSettings(): boolean {
        const params = this.contributedNode.parameters;
        const speed = this.withFallback(params.speed, 0.2);
        const acceleration = this.withFallback(params.acceleration, 0.2);
        const penUp = this.withFallback(params.penUp, 0.01);
        const penDown = this.withFallback(params.penDown, -0.005);
        const spaceBetweenLetters = this.withFallback(params.spaceBetweenLetters, 0.005);
        const spaceWidth = this.withFallback(params.spaceWidth, 0.025);
        const xOffset = this.withFallback(params.xOffset, 0.01);
        const yOffset = this.withFallback(params.yOffset, 0.02);

        return this.inRange(speed, 0.001, 2)
            && this.inRange(acceleration, 0.001, 10)
            && this.inRange(penUp, 0.001, 0.1)
            && this.inRange(penDown, -0.05, 0.05)
            && penUp > penDown
            && this.inRange(spaceBetweenLetters, 0, 0.1)
            && this.inRange(spaceWidth, 0.001, 0.2)
            && this.inRange(xOffset, -1, 1)
            && this.inRange(yOffset, -1, 1);
    }

    private inRange(value: number, min: number, max: number): boolean {
        return Number.isFinite(value) && value >= min && value <= max;
    }

    private withFallback(value: number | undefined, fallback: number): number {
        return Number.isFinite(value) ? (value as number) : fallback;
    }

    private async loadDropdownOptions(): Promise<void> {
        const [variables, frames] = await Promise.all([
            firstValueFrom(this.presenterAPI.variableService.variables()),
            firstValueFrom(this.presenterAPI.framesService.observeFrames()),
        ]);

        this.variableOptions = variables
            .filter((variable) => variable.valueType === VariableValueType.STRING)
            .map((variable) => variable.name);
        this.frameOptions = frames.map((frame: Frame) => frame.name);
        this.cd.detectChanges();
    }

    private getDropdownValue(selected: string | { value?: string }): string {
        if (typeof selected === 'string') {
            return selected;
        }
        return selected?.value ?? '';
    }

    async saveNode(): Promise<void> {
        this.cd.detectChanges();
        await this.presenterAPI.programNodeService.updateNode(this.contributedNode);
    }
}
