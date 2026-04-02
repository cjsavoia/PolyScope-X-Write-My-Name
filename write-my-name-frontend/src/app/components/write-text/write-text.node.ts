import { ProgramNode } from '@universal-robots/contribution-api';

export type WriteTextSourceMode = 'fixed' | 'variable';

export interface WriteTextParameters {
    textSourceMode: WriteTextSourceMode;
    fixedText: string;
    selectedVariable: string;
    selectedFrame: string;
    speed: number;
    acceleration: number;
    penUp: number;
    penDown: number;
    spaceBetweenLetters: number;
    spaceWidth: number;
    xOffset: number;
    yOffset: number;
}

export interface WriteTextNode extends ProgramNode {
    type: string;
    parameters: WriteTextParameters;
    lockChildren?: boolean;
    allowsChildren?: boolean;
}
