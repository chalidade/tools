// Reads and fills the AcroForm fields of a PDF (pdf-lib). The model here is
// plain data so the UI never touches pdf-lib objects. Nothing is uploaded.

import { openPdfDoc, pdfBlob } from '@/lib/pdf-doc'
import { tr } from '@/lib/i18n'

export type FieldKind = 'text' | 'check' | 'choice' | 'radio' | 'list'

export interface FormField {
  name: string
  kind: FieldKind
  /** 0-based page of the first widget, -1 if it could not be found. */
  page: number
  options: string[]
  multiline: boolean
  password: boolean
  maxLength?: number
  /** A dropdown that also accepts typed text. */
  editable: boolean
  readOnly: boolean
  /** Text/choice/radio value as a string, or a boolean for a checkbox. */
  value: string | boolean
}

export type FormValues = Record<string, string | boolean>

export interface FormInfo {
  fields: FormField[]
  pages: number
  /** The file carries an XFA form (Adobe LiveCycle); only its AcroForm side can be filled here. */
  xfa: boolean
}

export async function readForm(file: File): Promise<FormInfo> {
  const doc = await openPdfDoc(new Uint8Array(await file.arrayBuffer()))
  const { PDFTextField, PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFName, PDFDict, PDFRef } = await import('pdf-lib')
  const form = doc.getForm()

  const acro = doc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict)
  const xfa = !!acro?.has(PDFName.of('XFA'))

  // Which page each annotation lives on, keyed by its object reference.
  const pageOf = new Map<string, number>()
  doc.getPages().forEach((page, i) => {
    for (const a of page.node.Annots()?.asArray() ?? []) if (a instanceof PDFRef) pageOf.set(a.toString(), i)
  })

  const fields: FormField[] = []
  for (const f of form.getFields()) {
    const widgets = f.acroField.getWidgets()
    let page = -1
    for (const w of widgets) {
      const p = pageOf.get(doc.context.getObjectRef(w.dict)?.toString() ?? '')
      if (p !== undefined) {
        page = p
        break
      }
    }
    const base = { name: f.getName(), page, options: [] as string[], multiline: false, password: false, editable: false, readOnly: f.isReadOnly() }
    if (f instanceof PDFTextField) {
      fields.push({ ...base, kind: 'text', multiline: f.isMultiline(), password: f.isPassword(), maxLength: f.getMaxLength(), value: f.getText() ?? '' })
    } else if (f instanceof PDFCheckBox) {
      fields.push({ ...base, kind: 'check', value: f.isChecked() })
    } else if (f instanceof PDFDropdown) {
      fields.push({ ...base, kind: 'choice', options: f.getOptions(), editable: f.isEditable(), value: f.getSelected()[0] ?? '' })
    } else if (f instanceof PDFOptionList) {
      fields.push({ ...base, kind: 'list', options: f.getOptions(), value: f.getSelected()[0] ?? '' })
    } else if (f instanceof PDFRadioGroup) {
      fields.push({ ...base, kind: 'radio', options: f.getOptions(), value: f.getSelected() ?? '' })
    }
    // Buttons and signature fields cannot be filled here.
  }
  fields.sort((a, b) => (a.page < 0 ? 1e9 : a.page) - (b.page < 0 ? 1e9 : b.page))
  return { fields, pages: doc.getPageCount(), xfa }
}

/** Fields whose value differs from what the file had. */
export function changed(fields: FormField[], values: FormValues) {
  return fields.filter((f) => !f.readOnly && values[f.name] !== f.value)
}

/**
 * Writes the values into the document and saves it. `flatten` bakes the
 * answers into the page so they can no longer be edited. Returns the PDF and
 * the names of fields that could not take their value (e.g. a character the
 * form's font cannot draw).
 */
export async function fillForm(file: File, info: FormInfo, values: FormValues, flatten: boolean) {
  // Reopened each time so saving twice never flattens or fills an already-changed document.
  const doc = await openPdfDoc(new Uint8Array(await file.arrayBuffer()))
  const { PDFTextField, PDFCheckBox, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFName, PDFDict, StandardFonts } = await import('pdf-lib')
  const form = doc.getForm()
  // pdf-lib draws filled fields in Helvetica (WinAnsi); trying the text on it first catches characters it cannot encode, which would otherwise only fail at save.
  const helv = await doc.embedFont(StandardFonts.Helvetica)
  const failed: string[] = []
  for (const meta of changed(info.fields, values)) {
    const v = values[meta.name]
    try {
      const f = form.getField(meta.name)
      if (typeof v === 'string' && v && (f instanceof PDFTextField || f instanceof PDFDropdown)) helv.encodeText(v)
      if (f instanceof PDFTextField) f.setText(String(v) || undefined)
      else if (f instanceof PDFCheckBox) {
        if (v) f.check()
        else f.uncheck()
      }
      else if (f instanceof PDFDropdown) {
        if (v === '') f.clear()
        else f.select(String(v))
      } else if (f instanceof PDFOptionList) {
        if (v === '') f.clear()
        else f.select(String(v))
      } else if (f instanceof PDFRadioGroup) {
        if (v === '') f.clear()
        else f.select(String(v))
      }
    } catch {
      failed.push(meta.name)
    }
  }
  // A hybrid form's XFA side would override what we wrote, so drop it.
  if (info.xfa) doc.catalog.lookupMaybe(PDFName.of('AcroForm'), PDFDict)?.delete(PDFName.of('XFA'))
  if (flatten) form.flatten()
  return { blob: await pdfBlob(doc), failed }
}

export const KIND_LABEL: Record<FieldKind, () => string> = {
  text: () => tr('Teks', 'Text'),
  check: () => tr('Centang', 'Checkbox'),
  choice: () => tr('Pilihan', 'Dropdown'),
  radio: () => tr('Satu pilihan', 'Radio'),
  list: () => tr('Daftar', 'List'),
}
