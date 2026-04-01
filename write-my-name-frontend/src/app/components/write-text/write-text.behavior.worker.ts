/// <reference lib="webworker" />
import {
    AdvancedTranslatedProgramLabel,
    InsertionContext,
    OptionalPromise,
    ProgramBehaviors,
    ProgramNode,
    registerProgramBehavior,
    ScriptBuilder,
    ValidationContext,
    ValidationResponse
} from '@universal-robots/contribution-api';
import { WriteTextNode } from './write-text.node';

const createProgramNodeLabel = (node: WriteTextNode): AdvancedTranslatedProgramLabel => {
    const isFixed = node.parameters.textSourceMode === 'fixed';
    const textSource = isFixed
        ? (node.parameters.fixedText || 'No text entered')
        : (node.parameters.selectedVariable || 'No variable selected');
    const frame = node.parameters.selectedFrame || 'No frame selected';

    return [
        {
            type: 'primary',
            translationKey: 'program-node-labels.write-text.nodeTitle',
            interpolateParams: { textSource },
        },
        {
            type: 'secondary',
            translationKey: 'program-node-labels.write-text.subTitle',
            interpolateParams: { frame },
        },
    ];
};

// factory is required
const createProgramNode = (): OptionalPromise<WriteTextNode> => ({
    type: 'chsa-ur-write-my-name-write-text',
    version: '1.0.0',
    lockChildren: false,
    allowsChildren: false,
    parameters: {
        textSourceMode: 'fixed',
        fixedText: '',
        selectedVariable: '',
        selectedFrame: '',
    },
});

// generateCodeBeforeChildren is optional
const generateScriptCodeBefore = (node: WriteTextNode): OptionalPromise<ScriptBuilder> => new ScriptBuilder();

// generateCodeAfterChildren is optional
const generateScriptCodeAfter = (node: WriteTextNode): OptionalPromise<ScriptBuilder> => new ScriptBuilder();

// generateCodePreamble is optional
const generatePreambleScriptCode = (node: WriteTextNode): OptionalPromise<ScriptBuilder> => new ScriptBuilder();

const validate = (node: WriteTextNode, validationContext: ValidationContext): OptionalPromise<ValidationResponse> => {
    const hasFrame = !!node.parameters.selectedFrame;
    const hasTextSource = node.parameters.textSourceMode === 'fixed'
        ? !!node.parameters.fixedText
        : !!node.parameters.selectedVariable;

    return { isValid: hasTextSource && hasFrame };
};

// allowsChild is optional
const allowChildInsert = (node: ProgramNode, childType: string): OptionalPromise<boolean> => true;

// allowedInContext is optional
const allowedInsert = (insertionContext: InsertionContext): OptionalPromise<boolean> => true;

// upgradeNode is optional
const nodeUpgrade = (loadedNode: ProgramNode): ProgramNode => loadedNode;

const behaviors: ProgramBehaviors = {
    programNodeLabel: createProgramNodeLabel,
    factory: createProgramNode,
    generateCodeBeforeChildren: generateScriptCodeBefore,
    generateCodeAfterChildren: generateScriptCodeAfter,
    generateCodePreamble: generatePreambleScriptCode,
    validator: validate,
    allowsChild: allowChildInsert,
    allowedInContext: allowedInsert,
    upgradeNode: nodeUpgrade
};

registerProgramBehavior(behaviors);
