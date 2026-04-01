# Write My Name

A PolyScope X URCap that adds a **Write Text** program node to the UR robot toolbox.  
The robot uses this node to write operator-supplied text in physical space.

## V1 Scope

V1 ships a single contribution — the **Program Node** — with two input modes:

| Mode | Description |
|------|-------------|
| **Fixed** | Operator types text directly in the node UI |
| **Variable** | Operator selects an existing PolyScope variable |

Application Node, Operator Screen, and Rendering API integration are deferred to post-V1.

## Quick Start

### Install dependencies

```shell
npm install
```

### Build

```shell
npm run build
```

### Install to URSim

```shell
npm run install-urcap
```

### Install to robot

```shell
npm run install-urcap -- --host <robot_ip_address>
```

## Usage

1. Open a UR program in PolyScope X.
2. Insert the **Write Text** node from the toolbox.
3. Choose **Fixed** or **Variable** source mode.
4. Enter text (fixed) or select a variable.
5. Select a frame.
6. Run the program — the node generates the corresponding URScript output.

## Verification

- `npm run lint` passes cleanly
- `npm run build` succeeds
- Root `npm run build` produces an installable `.urcapx`
- Node appears in the simulator toolbox and inserts correctly
- Both fixed and variable modes generate valid script
