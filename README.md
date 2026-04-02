# Write My Name URCap

`Write My Name` is a PolyScope X URCap that contributes one program node, **Write Text**.
The node lets an operator configure text input and writing parameters in the program tree.

## Current Status

The project currently includes:

- A single **Program Node** contribution (`Write Text`)
- Text source modes:
  - **Fixed**: text entered directly in the node
  - **Variable**: selected PolyScope string variable
- Required **Frame** selection
- Advanced settings dialog for:
  - speed and acceleration
  - pen up/down heights
  - letter and space spacing
  - X/Y offsets
- Program-tree labels that show the selected text source and frame
- Node validation for required inputs and advanced parameter ranges

## Known Limitation

URScript generation is **not implemented yet** in the behavior worker.  
The script hooks (`generateCodePreamble`, `generateCodeBeforeChildren`, `generateCodeAfterChildren`) currently return empty `ScriptBuilder` instances, so the node does not yet write motion script to the robot.

## Project Layout

```text
manifest.yaml
write-my-name-frontend/
  src/app/components/write-text/
    write-text.component.ts
    write-text.component.html
    write-text.behavior.worker.ts
    write-text.node.ts
```

## Prerequisites

- Node.js and npm
- PolyScope X SDK tooling available in your environment (`package-urcap`, `install-urcap`, `validate-manifest`, etc.)
- Access to URSim or a robot for deployment

## Build and Package

Install dependencies:

```bash
npm install
```

Build frontend and package URCap (`.urcapx` in `target/`):

```bash
npm run build
```

Optional checks:

```bash
npm run lint
npm run validate-manifest
```

## Deploy

Install to URSim:

```bash
npm run install-urcap
```

Install to a robot:

```bash
npm run install-urcap -- --host <robot_ip_address>
```

Remove from simulator:

```bash
npm run delete-urcap
```

## Run Frontend Dev Server

```bash
npm run start
```

## Usage in PolyScope X

1. Insert **Write Text** from the toolbox.
2. Choose **Fixed** or **Variable** source mode.
3. Enter text or select a string variable.
4. Select a frame.
5. Optionally tune advanced settings from the `...` button.

The node state and validation are active, but motion script output is pending future implementation.
