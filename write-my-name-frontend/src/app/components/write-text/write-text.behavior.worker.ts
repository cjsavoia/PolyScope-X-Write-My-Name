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

const DEFAULTS = {
    speed: 0.2,
    acceleration: 0.2,
    penUp: 0.01,
    penDown: -0.005,
    spaceBetweenLetters: 0.005,
    spaceWidth: 0.025,
    xOffset: 0.01,
    yOffset: 0.02,
};

const inRange = (value: number, min: number, max: number): boolean =>
    Number.isFinite(value) && value >= min && value <= max;

const withFallback = (value: number | undefined, fallback: number): number =>
    Number.isFinite(value) ? (value as number) : fallback;

const hasValidAdvancedParameters = (node: WriteTextNode): boolean => {
    const speed = withFallback(node.parameters.speed, DEFAULTS.speed);
    const acceleration = withFallback(node.parameters.acceleration, DEFAULTS.acceleration);
    const penUp = withFallback(node.parameters.penUp, DEFAULTS.penUp);
    const penDown = withFallback(node.parameters.penDown, DEFAULTS.penDown);
    const spaceBetweenLetters = withFallback(node.parameters.spaceBetweenLetters, DEFAULTS.spaceBetweenLetters);
    const spaceWidth = withFallback(node.parameters.spaceWidth, DEFAULTS.spaceWidth);
    const xOffset = withFallback(node.parameters.xOffset, DEFAULTS.xOffset);
    const yOffset = withFallback(node.parameters.yOffset, DEFAULTS.yOffset);

    return inRange(speed, 0.001, 2)
        && inRange(acceleration, 0.001, 10)
        && inRange(penUp, 0.001, 0.1)
        && inRange(penDown, -0.05, 0.05)
        && penUp > penDown
        && inRange(spaceBetweenLetters, 0, 0.1)
        && inRange(spaceWidth, 0.001, 0.2)
        && inRange(xOffset, -1, 1)
        && inRange(yOffset, -1, 1);
};

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
        speed: 0.2,
        acceleration: 0.2,
        penUp: 0.01,
        penDown: -0.005,
        spaceBetweenLetters: 0.005,
        spaceWidth: 0.025,
        xOffset: 0.01,
        yOffset: 0.02,
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
    const hasValidAdvancedSettings = hasValidAdvancedParameters(node);

    return { isValid: hasTextSource && hasFrame && hasValidAdvancedSettings };
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
