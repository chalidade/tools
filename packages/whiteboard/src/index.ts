// The headless API: read and render a board saved by the tool (its .json file),
// without the editor. The source lives with the site (src/tools/whiteboard/).
//
//   import { isBoardDoc, renderPage } from '@chalidade/whiteboard'
//   const doc = JSON.parse(text); if (isBoardDoc(doc)) document.body.append(renderPage(doc.pages[0], doc))

export {
  isBoardDoc,
  emptyDoc,
  renderPage,
  drawItems,
  drawItem,
  drawSurface,
  contentBounds,
  boundsOf,
  COLORS,
  SURFACES,
  type BoardDoc,
  type Page,
  type Item,
  type StrokeItem,
  type ShapeItem,
  type TextItem,
  type Point,
  type Surface,
  type Pattern,
} from '@/tools/whiteboard/board'
