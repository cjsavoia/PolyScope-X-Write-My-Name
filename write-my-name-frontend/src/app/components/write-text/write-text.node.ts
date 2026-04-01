import { ProgramNode } from '@universal-robots/contribution-api';

export type WriteTextSourceMode = 'fixed' | 'variable';

export interface WriteTextParameters {
    textSourceMode: WriteTextSourceMode;
    fixedText: string;
    selectedVariable: string;
    selectedFrame: string;
}

export interface WriteTextNode extends ProgramNode {
    type: string;
    parameters: WriteTextParameters;
    lockChildren?: boolean;
    allowsChildren?: boolean;
}
