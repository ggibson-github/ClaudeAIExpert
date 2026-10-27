---
name: visual-page
description: >-
  Opens a shared visual page beside chat and fills it from the current
  conversation. Use when a diagram, chart, timeline, map, layout, class
  model, or moving process would communicate better than chat alone, or when
  the operator edits the page, mentions the visual page, or asks to show a
  picture, animation, flow, architecture, network, mind map, or factory-style
  route.
---

# Visual page

This project uses Claude skills in `.claude/skills`. Chat stays the conversation. A short choice uses AskUserQuestion. This page is a third channel. Pick a picture language, fill it from the conversation, and read the operator's edits. Do not paste an HTML drawing. Do not keep finished example stories.

The page files are the `runtime` folder next to this skill:

`.claude/skills/visual-page/runtime`

This project's picture:

`whiteboard/scene.json`
`whiteboard/edits.json`

Create `whiteboard` in the project root if it is missing. The server copies the empty templates on first start.

## Start

Read `whiteboard/server.json` if it exists. It stores the URL for this project.

- Request that URL's `/health`. If `data` is this project's `whiteboard` folder, open that URL.
- Otherwise, from the project root, run `python -u ".claude/skills/visual-page/runtime/serve.py" --data "whiteboard"`. Do not choose a port. The server reuses this project's page if one is already running. If another project has the default port, it binds the next free port. It writes `whiteboard/server.json`.
- Open the `url` in `whiteboard/server.json`.

Leave the page open. It follows new revisions without a refresh.

## Before changing the picture

Read `whiteboard/edits.json`. Apply every item whose `baseRev` equals the current scene `rev`.

- `move` — dragged a node
- `connect` — drew an arrow, `from` toward `to`
- `reverse` — flipped an arrow
- `delete` — removed a node or arrow
- `annotate` — circled a node. `color` is `blue`, `red`, `green`, or `orange`. The same color again removes it
- `relabel` — changed a label
- `add-node` — added an item from the palette
- `reroute` — set a token's route to these edge ids, in order
- `layout` — automatic placement. Ignore it when reading intent

The chat message says what an edit means. Publish a new scene that includes both. Raise `rev` by 1. Leave older edit items in the file. A new `rev` does not reuse them.

## Publish

Write `whiteboard/scene.json`.

- `language` is one of `flow`, `class`, `chart`, `timeline`, `material-flow`, `map`, `layout`.
- Omit `x` and `y` so `layered`, `tree`, or `radial` layout can place nodes. Use `layout: "free"` only when position is the point.
- Add `timeline` only when change over time is what you are saying. A token lists edge ids in `route` and moves while the page plays.
- Set `interactive` true when the operator should change the picture.

`flow` is steps, decisions, architecture blocks, networks, org charts, and mind maps. Change `layout` and node kind (`step`, `decision`, `system`, `person`, `store`, `topic`). `class` nodes have `attributes` and `operations`. `chart` is `bar`, `line`, or `pie` with `data.rows`. `timeline` events have `time` and `when`. `material-flow` and `map` are places, routes, and tokens. `layout` is regions.

## What not to do

- Do not put a yes/no choice on the page. Use AskUserQuestion.
- Do not write a one-off HTML picture.
- Do not store a library of finished scenes in the skill.
