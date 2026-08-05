// ส่งออกรายงาน 4 แบบ: CSV / Excel / PDF / Print
// xlsx + jspdf + html2canvas โหลดแบบ dynamic — ไม่ถ่วง bundle หน้าอื่น

export type Table = { title: string; headers: string[]; rows: (string | number)[][] }

function stamp(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function exportCSV(t: Table, filename?: string) {
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [t.headers.map(esc).join(','), ...t.rows.map((r) => r.map(esc).join(','))]
  // BOM ให้ Excel ไทยไม่เพี้ยน
  download(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
    filename || `${t.title}-${stamp()}.csv`)
}

export async function exportXLSX(t: Table, filename?: string) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([t.headers, ...t.rows])
  // ความกว้างคอลัมน์พออ่าน (ตามความยาวข้อมูล)
  ws['!cols'] = t.headers.map((h, i) => ({
    wch: Math.min(40, Math.max(h.length + 4, ...t.rows.map((r) => String(r[i] ?? '').length + 2))),
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, t.title.slice(0, 31) || 'Report')
  XLSX.writeFile(wb, filename || `${t.title}-${stamp()}.xlsx`)
}

/** สร้างหน้ารายงาน HTML สำหรับ Print/PDF — ตารางสีอ่านง่ายบนกระดาษ */
function reportHTML(t: Table, sub: string): string {
  const th = t.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const trs = t.rows.map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c ?? ''))}</td>`).join('')}</tr>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(t.title)}</title><style>
    body{font-family:'Noto Sans Thai Looped',system-ui,sans-serif;color:#101521;margin:28px;font-size:13px}
    h1{font-size:17px;margin:0 0 2px} .sub{color:#59616f;font-size:11.5px;margin:0 0 14px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#f0f2f6;text-align:left;padding:7px 9px;border:1px solid #d3dae3;font-size:10.5px}
    td{padding:6px 9px;border:1px solid #e6e9ef}
    tr:nth-child(even) td{background:#fafbfc}
    @media print{body{margin:10mm}}
  </style></head><body><h1>${escapeHtml(t.title)}</h1><p class="sub">${escapeHtml(sub)}</p>
  <table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function printTable(t: Table, sub: string) {
  // เปิดเป็น Blob URL (ไม่ใช้ document.write) — สคริปต์ในหน้าสั่ง print เองหลังโหลดเสร็จ
  const html = reportHTML(t, sub).replace('</body>',
    '<script>window.onload=function(){setTimeout(function(){window.print()},350)}</script></body>')
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  window.open(url, '_blank', 'width=980,height=760')
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export async function exportPDF(t: Table, sub: string, filename?: string) {
  // เรนเดอร์หน้ารายงานใน iframe แล้วแปลงเป็นภาพลง PDF (ฟอนต์ไทยติดมากับภาพ ไม่ต้องฝังฟอนต์)
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'), import('jspdf'),
  ])
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0'
  iframe.srcdoc = reportHTML(t, sub) // srcdoc แทน document.write
  document.body.appendChild(iframe)
  try {
    await new Promise((r) => { iframe.onload = r })
    const doc = iframe.contentDocument!
    await new Promise((r) => setTimeout(r, 500)) // รอ font/layout
    const body = doc.body
    const canvas = await html2canvas(body, { scale: 2, backgroundColor: '#ffffff', windowWidth: 900 })
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = 210, pageH = 297, margin = 8
    const imgW = pageW - margin * 2
    const imgH = (canvas.height / canvas.width) * imgW
    // ตัดเป็นหลายหน้าเมื่อยาวเกิน A4
    let done = 0
    const pagePx = ((pageH - margin * 2) / imgW) * canvas.width
    while (done < canvas.height) {
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = Math.min(pagePx, canvas.height - done)
      slice.getContext('2d')!.drawImage(canvas, 0, done, canvas.width, slice.height, 0, 0, canvas.width, slice.height)
      if (done > 0) pdf.addPage()
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, (slice.height / canvas.width) * imgW)
      done += slice.height
    }
    void imgH
    pdf.save(filename || `${t.title}-${stamp()}.pdf`)
  } finally {
    iframe.remove()
  }
}
