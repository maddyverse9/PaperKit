# ADR 002: Serialized Board JSON Shape

## Context

The spec states that board state must be fully serializable: `board.toJSON()` and `Board.fromJSON()` must round-trip losslessly. The spec referred to this structure as `interface Board { papers: Paper[] }`. However, using the name `Board` for both the data transfer object and the active controller class leads to namespace collisions in TypeScript and confusing imports.

## Decision

1. Name the serialized interface `BoardJSON` while retaining `board.toJSON(): BoardJSON` and `Board.fromJSON(json: BoardJSON): Board`.
2. Include an explicit schema `version: 1` field in the root object.
3. Validate all fields rigorously at runtime with descriptive `PaperkitJSONError` exceptions.

## Consequences

- Clean separation between active stateful class `Board` and the passive data object `BoardJSON`.
- Future schema migrations can branch on the `version` property without breaking backward compatibility.
- Lossless round-trip equality: `Board.fromJSON(b.toJSON()).toJSON()` deep-equals `b.toJSON()`.
