import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { WebComponentDialogAPI } from '@universal-robots/contribution-api';
import { WebComponentDialogComponent } from '@universal-robots/contribution-api/angular';
import { WriteTextSettingsDialogModel } from './write-text-settings-dialog.model';

@Component({
    templateUrl: './write-text-settings-dialog.component.html',
    styleUrls: ['./write-text-settings-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class WriteTextSettingsDialogComponent
    implements WebComponentDialogComponent<WriteTextSettingsDialogModel, WriteTextSettingsDialogModel>, OnInit
{
    @Input() inputData!: WriteTextSettingsDialogModel;
    @Input() presenterApi!: WebComponentDialogAPI;

    @Output() outputDataChange = new EventEmitter<WriteTextSettingsDialogModel>();
    @Output() canSave = new EventEmitter<boolean>();

    speed = 0.2;
    acceleration = 0.2;
    penUp = 0.01;
    penDown = -0.005;
    spaceBetweenLetters = 0.005;
    spaceWidth = 0.025;
    xOffset = 0.01;
    yOffset = 0.02;
    activeTab = 'movement';
    private readonly defaults = {
        speed: 0.2,
        acceleration: 0.2,
        penUp: 0.01,
        penDown: -0.005,
        spaceBetweenLetters: 0.005,
        spaceWidth: 0.025,
        xOffset: 0.01,
        yOffset: 0.02,
    };

    onLinkChanged(event: string): void {
        this.activeTab = event;
    }

    ngOnInit(): void {
        this.speed = this.coerceNumber(this.inputData.speed, this.defaults.speed);
        this.acceleration = this.coerceNumber(this.inputData.acceleration, this.defaults.acceleration);
        this.penUp = this.coerceNumber(this.inputData.penUp, this.defaults.penUp);
        this.penDown = this.coerceNumber(this.inputData.penDown, this.defaults.penDown);
        this.spaceBetweenLetters = this.coerceNumber(this.inputData.spaceBetweenLetters, this.defaults.spaceBetweenLetters);
        this.spaceWidth = this.coerceNumber(this.inputData.spaceWidth, this.defaults.spaceWidth);
        this.xOffset = this.coerceNumber(this.inputData.xOffset, this.defaults.xOffset);
        this.yOffset = this.coerceNumber(this.inputData.yOffset, this.defaults.yOffset);

        this.emitOutput();
        this.emitCanSave();
    }

    setSpeed(value: string): void {
        this.speed = Number(value);
        this.emitOutputAndValidity();
    }

    setAcceleration(value: string): void {
        this.acceleration = Number(value);
        this.emitOutputAndValidity();
    }

    setPenUp(value: string): void {
        this.penUp = Number(value);
        this.emitOutputAndValidity();
    }

    setPenDown(value: string): void {
        this.penDown = Number(value);
        this.emitOutputAndValidity();
    }

    setSpaceBetweenLetters(value: string): void {
        this.spaceBetweenLetters = Number(value);
        this.emitOutputAndValidity();
    }

    setSpaceWidth(value: string): void {
        this.spaceWidth = Number(value);
        this.emitOutputAndValidity();
    }

    setXOffset(value: string): void {
        this.xOffset = Number(value);
        this.emitOutputAndValidity();
    }

    setYOffset(value: string): void {
        this.yOffset = Number(value);
        this.emitOutputAndValidity();
    }

    motionSummary(): string {
        return `${this.formatFixed(this.speed)} m/s`;
    }

    penSummary(): string {
        return `${this.formatFixed(this.penUp)} / ${this.formatFixed(this.penDown)} m`;
    }

    fontSummary(): string {
        return `${this.formatFixed(this.spaceBetweenLetters)} / ${this.formatFixed(this.spaceWidth)} m`;
    }

    positionSummary(): string {
        return `${this.formatFixed(this.xOffset)}, ${this.formatFixed(this.yOffset)} m`;
    }

    private emitOutputAndValidity(): void {
        this.emitOutput();
        this.emitCanSave();
    }

    private emitCanSave(): void {
        const isValid = this.inRange(this.speed, 0.001, 2)
            && this.inRange(this.acceleration, 0.001, 10)
            && this.inRange(this.penUp, 0.001, 0.1)
            && this.inRange(this.penDown, -0.05, 0.05)
            && this.penUp > this.penDown
            && this.inRange(this.spaceBetweenLetters, 0, 0.1)
            && this.inRange(this.spaceWidth, 0.001, 0.2)
            && this.inRange(this.xOffset, -1, 1)
            && this.inRange(this.yOffset, -1, 1);
        this.canSave.emit(isValid);
    }

    private inRange(value: number, min: number, max: number): boolean {
        return Number.isFinite(value) && value >= min && value <= max;
    }

    private coerceNumber(value: number | undefined, fallback: number): number {
        return Number.isFinite(value) ? (value as number) : fallback;
    }

    private formatFixed(value: number): string {
        return Number.isFinite(value) ? value.toFixed(3) : '0.000';
    }

    private emitOutput(): void {
        this.outputDataChange.emit({
            ...this.inputData,
            speed: this.speed,
            acceleration: this.acceleration,
            penUp: this.penUp,
            penDown: this.penDown,
            spaceBetweenLetters: this.spaceBetweenLetters,
            spaceWidth: this.spaceWidth,
            xOffset: this.xOffset,
            yOffset: this.yOffset,
        });
    }
}
