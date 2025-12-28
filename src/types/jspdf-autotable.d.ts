declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf'

  interface CellDef {
    content?: string | number
    colSpan?: number
    rowSpan?: number
    styles?: Partial<Styles>
  }

  interface ColumnInput {
    header?: string | number
    dataKey?: string | number
  }

  interface Styles {
    fillColor?: number[] | string
    textColor?: number[] | string
    fontStyle?: 'normal' | 'bold' | 'italic' | 'bolditalic'
    fontSize?: number
    halign?: 'left' | 'center' | 'right'
    valign?: 'top' | 'middle' | 'bottom'
    cellPadding?: number
    cellWidth?: number | 'auto' | 'wrap'
  }

  interface UserOptions {
    head?: (string | number | CellDef)[][]
    body?: any[][]
    foot?: (string | number | CellDef)[][]
    columns?: ColumnInput[]
    startY?: number
    margin?: number | { left?: number; right?: number; top?: number; bottom?: number }
    pageBreak?: 'auto' | 'avoid' | 'always'
    tableWidth?: 'auto' | 'wrap' | number
    theme?: 'striped' | 'grid' | 'plain'
    headStyles?: Partial<Styles>
    bodyStyles?: Partial<Styles>
    footStyles?: Partial<Styles>
    alternateRowStyles?: Partial<Styles>
    columnStyles?: { [key: number]: Partial<Styles> }
    didParseCell?: (data: CellHookData) => void
    didDrawCell?: (data: CellHookData) => void
    didDrawPage?: (data: HookData) => void
  }

  interface CellHookData {
    cell: {
      text: string[]
      styles: Styles
      x: number
      y: number
      height: number
      width: number
    }
    row: {
      index: number
      section: 'head' | 'body' | 'foot'
    }
    column: {
      index: number
      dataKey?: string | number
    }
    section: 'head' | 'body' | 'foot'
  }

  interface HookData {
    pageNumber: number
    pageCount: number
    settings: UserOptions
    table: any
    cursor: { x: number; y: number }
  }

  export default function autoTable(doc: jsPDF, options: UserOptions): jsPDF
}
