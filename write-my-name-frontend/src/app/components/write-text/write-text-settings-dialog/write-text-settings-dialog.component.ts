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

    ngOnInit(): void {
        this.outputDataChange.emit(this.inputData);
        this.canSave.emit(true);
    }
}
