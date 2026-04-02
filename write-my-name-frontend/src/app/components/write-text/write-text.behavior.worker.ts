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
import { CHAR_TO_LETTER, LETTER_LIBRARY, LetterDef, LetterPoint, LetterStrokeDef } from './write-text-letters';

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

const LETTER_ORIENTATION = '3.1415,0,0';
const UNSUPPORTED_CHAR_MESSAGE = 'The following special characters are not possible: ! # & ; @ ^ { } ? < > and Quotation mark';
const WMN_T = 'wmn_t';
const WMN_LOOKAHEAD_TIME = 'wmn_lookahead_time';
const WMN_GAIN = 'wmn_gain';
const WMN_ACCELERATION = 'wmn_acceleration';
const WMN_SPEED = 'wmn_speed';
const WMN_PEN_UP = 'wmn_pen_up';
const WMN_PEN_DOWN = 'wmn_pen_down';
const WMN_SPACE_BETWEEN_LETTERS = 'wmn_space_between_letters';
const WMN_SPACE = 'wmn_space';
const WMN_X_OFFSET_TEXT = 'wmn_x_offset_text';
const WMN_Y_OFFSET_TEXT = 'wmn_y_offset_text';
const WMN_PLANE = 'wmn_plane';
const WMN_PLANE_ORIGINAL = 'wmn_plane_original';

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

const formatCoord = (value: number): string => Number(value.toFixed(7)).toString();

const toPoseExpr = (point: LetterPoint, zExpr: string): string =>
    `pose_trans(${WMN_PLANE},p[${formatCoord(point[0])},${formatCoord(point[1])},${zExpr},${LETTER_ORIENTATION}])`;

const escapeUrString = (value: string): string =>
    value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');

const createStrokeScript = (stroke: LetterStrokeDef): string[] => {
    const lines: string[] = [];

    lines.push(`  movel(${toPoseExpr(stroke.entryPoint, WMN_PEN_UP)},${WMN_ACCELERATION},${WMN_SPEED})`);
    lines.push(`  movel(${toPoseExpr(stroke.entryPoint, WMN_PEN_DOWN)},${WMN_ACCELERATION},${WMN_SPEED})`);
    for (const point of stroke.servoPoints) {
        lines.push(`  servoj(get_inverse_kin(${toPoseExpr(point, WMN_PEN_DOWN)}),0,0,${WMN_T},${WMN_LOOKAHEAD_TIME},${WMN_GAIN})`);
    }
    lines.push('  stopj(3)');
    lines.push(`  movel(${toPoseExpr(stroke.exitPoint, WMN_PEN_UP)},${WMN_ACCELERATION},${WMN_SPEED})`);

    return lines;
};

const createLetterFunctionScript = (letter: LetterDef): string => {
    const lines: string[] = [];
    lines.push(`# Start of ${letter.functionName}`);
    lines.push('###');
    lines.push(`# Draws ${letter.functionName} strokes using servoj waypoints`);
    lines.push(`# @param ${WMN_PLANE} pose base frame for letter drawing`);
    lines.push('###');
    lines.push(`def ${letter.functionName}():`);
    for (const stroke of letter.strokes) {
        lines.push(...createStrokeScript(stroke));
    }
    lines.push(`  ${WMN_PLANE}=pose_trans(${WMN_PLANE},p[${formatCoord(letter.width)}+${WMN_SPACE_BETWEEN_LETTERS},0,0,0,0,0])`);
    lines.push('end');
    lines.push(`# End of ${letter.functionName}`);
    return lines.join('\n');
};

const createDispatcherScript = (allowedChars?: ReadonlySet<string>): string => {
    const letterToChars = new Map<string, string[]>();

    for (const [char, fnName] of Object.entries(CHAR_TO_LETTER)) {
        if (allowedChars && !allowedChars.has(char)) {
            continue;
        }
        if (!letterToChars.has(fnName)) {
            letterToChars.set(fnName, []);
        }
        letterToChars.get(fnName)?.push(char);
    }

    const functionEntries = Object.keys(LETTER_LIBRARY)
        .filter((fnName) => (letterToChars.get(fnName)?.length ?? 0) > 0)
        .map((fnName) => ({
            fnName,
            chars: letterToChars.get(fnName) as string[],
        }));

    const lines: string[] = [];
    lines.push('# Start of writeMyCharacter');
    lines.push('###');
    lines.push('# Dispatches one character to the matching letter function');
    lines.push('# @param character string character to write');
    lines.push('###');
    lines.push('def writeMyCharacter(character):');
    functionEntries.forEach((entry, index) => {
        const conditions = entry.chars.map((char) => `character=="${char}"`).join(' or ');
        const branch = index === 0 ? 'if' : 'elif';
        lines.push(`  ${branch}(${conditions}):`);
        lines.push(`    ${entry.fnName}()`);
    });
    lines.push('  else:');
    lines.push(`    popup("${UNSUPPORTED_CHAR_MESSAGE}")`);
    lines.push('  end');
    lines.push('end');
    lines.push('# End of writeMyCharacter');

    return lines.join('\n');
};

const getRequiredLettersForNode = (node: WriteTextNode): LetterDef[] => {
    if (node.parameters.textSourceMode !== 'fixed') {
        return Object.values(LETTER_LIBRARY);
    }

    const fixedText = node.parameters.fixedText || '';
    const usedFunctionNames = new Set<string>();
    for (const char of fixedText) {
        const functionName = CHAR_TO_LETTER[char];
        if (functionName) {
            usedFunctionNames.add(functionName);
        }
    }

    return Object.values(LETTER_LIBRARY).filter((letter) => usedFunctionNames.has(letter.functionName));
};

const createPreambleScript = (node: WriteTextNode): string => {
    const requiredLetters = getRequiredLettersForNode(node);
    const allowedChars = node.parameters.textSourceMode === 'fixed'
        ? new Set((node.parameters.fixedText || '').split(''))
        : undefined;
    const letterDefinitions = requiredLetters.map(createLetterFunctionScript);
    return `${createDispatcherScript(allowedChars)}\n\n${letterDefinitions.join('\n\n')}\n`;
};

const createBeforeChildrenScript = (node: WriteTextNode): string => {
    const speed = withFallback(node.parameters.speed, DEFAULTS.speed);
    const acceleration = withFallback(node.parameters.acceleration, DEFAULTS.acceleration);
    const penUp = withFallback(node.parameters.penUp, DEFAULTS.penUp);
    const penDown = withFallback(node.parameters.penDown, DEFAULTS.penDown);
    const spaceBetweenLetters = withFallback(node.parameters.spaceBetweenLetters, DEFAULTS.spaceBetweenLetters);
    const spaceWidth = withFallback(node.parameters.spaceWidth, DEFAULTS.spaceWidth);
    const xOffset = withFallback(node.parameters.xOffset, DEFAULTS.xOffset);
    const yOffset = withFallback(node.parameters.yOffset, DEFAULTS.yOffset);
    const selectedFrame = node.parameters.selectedFrame || 'base';
    const selectedFrameIdLiteral = `"${escapeUrString(selectedFrame)}"`;

    const textExpression = node.parameters.textSourceMode === 'fixed'
        ? `"${escapeUrString(node.parameters.fixedText || '')}"`
        : (node.parameters.selectedVariable || '""');

    return [
        '# Start of Write Text Runtime',
        '###',
        '# Runtime settings and loop for text writing',
        '# @param selectedFrame frame used as writing plane',
        '# @param Text source text (fixed or variable)',
        '###',
        '# Speed settings',
        `global ${WMN_T}=0.05`,
        `global ${WMN_LOOKAHEAD_TIME}=0.05`,
        `global ${WMN_GAIN}=1500`,
        '# Move settings',
        `global ${WMN_ACCELERATION}=${formatCoord(acceleration)}`,
        `global ${WMN_SPEED}=${formatCoord(speed)}`,
        '# Pen and spacing settings',
        `global ${WMN_PEN_UP}=${formatCoord(penUp)}`,
        `global ${WMN_PEN_DOWN}=${formatCoord(penDown)}`,
        `global ${WMN_SPACE_BETWEEN_LETTERS}=${formatCoord(spaceBetweenLetters)}`,
        `global ${WMN_SPACE}=${formatCoord(spaceWidth)}`,
        '# Text frame offset',
        `global ${WMN_X_OFFSET_TEXT}=${formatCoord(xOffset)}`,
        `global ${WMN_Y_OFFSET_TEXT}=${formatCoord(yOffset)}`,
        `global ${WMN_PLANE}=pose_trans(get_pose(${selectedFrameIdLiteral}),p[${WMN_X_OFFSET_TEXT},${WMN_Y_OFFSET_TEXT},0,0,0,0])`,
        `global ${WMN_PLANE_ORIGINAL}=${WMN_PLANE}`,
        '# Text source and character iteration',
        `wmn_text=${textExpression}`,
        'wmn_index=0',
        'wmn_text_length=str_len(wmn_text)',
        'while (wmn_index<wmn_text_length):',
        '  wmn_char=str_at(wmn_text, wmn_index)',
        '  if(wmn_char!=" "):',
        '    writeMyCharacter(wmn_char)',
        '  else:',
        `    ${WMN_PLANE}=pose_trans(${WMN_PLANE},p[${WMN_SPACE},0,0,0,0,0])`,
        '  end',
        '  wmn_index=wmn_index+1',
        'end',
        `${WMN_PLANE}=${WMN_PLANE_ORIGINAL}`,
        '# End of Write Text Runtime',
        '',
    ].join('\n');
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
const generateScriptCodeBefore = (node: WriteTextNode): OptionalPromise<ScriptBuilder> => {
    const scriptBuilder = new ScriptBuilder();
    scriptBuilder.addRaw(createBeforeChildrenScript(node));
    return scriptBuilder;
};

// generateCodeAfterChildren is optional
const generateScriptCodeAfter = (node: WriteTextNode): OptionalPromise<ScriptBuilder> => new ScriptBuilder();

// generateCodePreamble is optional
const generatePreambleScriptCode = (node: WriteTextNode): OptionalPromise<ScriptBuilder> => {
    const scriptBuilder = new ScriptBuilder();
    scriptBuilder.addRaw(createPreambleScript(node));
    return scriptBuilder;
};

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
