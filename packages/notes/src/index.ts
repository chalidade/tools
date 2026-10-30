// The headless API. The source lives with the site (src/tools/notes/),
// so the tool on chalidade.github.io/tools and this package are the same code.
//
//   import { renderMarkdown, taskCount } from '@chalidade/notes'
//   el.innerHTML = renderMarkdown('- [x] done\n- [ ] todo') // sanitized with DOMPurify

export {
  renderMarkdown,
  toggleTask,
  taskCount,
  continueList,
  wrap,
  prefixLines,
  displayTitle,
  snippet,
  noteAsMarkdown,
  isNoteList,
  NOTE_COLORS,
  type Note,
  type NoteColor,
} from '@/tools/notes/notes'
