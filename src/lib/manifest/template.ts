import type { ApiManifest, Seat, SeatMap } from './types'
import { escapeHtml as e } from './print'

/*
| Printed manifests — the legacy DCS design (flightmodev2 resources/views/pages/reports/oci_report/
| passenger_man.blade.php, opened by the counter's "Manifest" dialog): seatmap / W&B load distribution,
| passenger manifest and baggage manifest, each printed the chosen number of times.
| Styles and markup are carried over unchanged; only the data comes from ManifestService.
*/

export type ManifestOptions = {
  /** copies of each report; 0 = not printed */
  balance: number
  passengers: number
  baggage: number
  /** "Үйлдсэн" — printed as PREPARED BY */
  preparedBy: string
}

const STYLE = `
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: 'Share Tech Mono', monospace; }

        table { width: 100%; border-collapse: collapse; }
        th, td {
            padding: 1px 4px;
            border: 0.5px solid #bbb;
            font-size: 9px;
            text-align: left;
            line-height: 1.3;
            white-space: nowrap;
        }
        thead th {
            background: #e8e8e8;
            font-weight: 700;
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 10px;
            letter-spacing: 0.3px;
            padding: 2px 4px;
        }
        tbody tr:nth-child(even) { background: #fafafa; }
        tfoot th, tfoot td {
            background: #efefef;
            font-weight: 700;
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 10px;
            border-top: 1px solid #999;
        }

        .page-container { width: 100%; position: relative; }
        .header { width: 100%; padding: 6px 0; }
        .signature { padding: 6px 0; font-size: 10px; }

        .manifest-root {
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
            color: #111;
            background: #fff;
            padding: 0;
            max-width: 100%;
            border: 1px solid #ccc;
        }

        .manifest-subheader {
               color: #111;
            font-family: 'Barlow Condensed', sans-serif;
            font-size: 13px;
            font-weight: 700;
            padding: 5px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #111;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 6px 12px;
            border-bottom: 1px solid #ccc;
            font-size: 11px;
            font-family: 'Barlow Condensed', sans-serif;
        }
        .manifest-subheader .logo-box {
            font-size: 18px;
            font-weight: 700;
            color: #111;
            letter-spacing: -0.5px;
            white-space: nowrap;
        }
        .manifest-subheader .flight-info { flex: 1; line-height: 1.6; }
        .manifest-subheader .flight-info b { font-weight: 600; font-size: 12px; }

        .manifest-body { display: flex; gap: 0; }

        .seatmap-col {
            flex: 1;
            padding: 8px 12px;
            border-right: 1px solid #ddd;
            min-width: 0;
        }

        .stats-col {
            width: 220px;
            padding: 8px 12px;
            flex-shrink: 0;
            font-size: 11px;
            line-height: 1.7;
        }
        .stats-col .stats-section { margin-bottom: 10px; }
        .stats-col .stats-section .s-label {
            font-family: 'Barlow Condensed', sans-serif;
            font-weight: 700;
            font-size: 12px;
            text-decoration: underline;
            color: #111;
            margin-bottom: 2px;
        }
        .stats-col .stats-section p { margin: 0; color: #111; font-size: 11px; }

        .zone-label {
            font-family: 'Barlow Condensed', sans-serif;
            font-weight: 700;
            font-size: 11px;
            color: #555;
            margin: 6px 0 2px;
            border-bottom: 1px dashed #ddd;
            padding-bottom: 2px;
            letter-spacing: 0.3px;
        }

        .seat-row {
            display: flex;
            align-items: center;
            height: 20px;
            margin-bottom: 1px;
        }
        .row-num {
            width: 20px;
            font-size: 10px;
            color: #888;
            text-align: right;
            padding-right: 4px;
            flex-shrink: 0;
        }
        .seat-group { display: flex; gap: 3px; align-items: center; }
        .aisle { width: 10px; flex-shrink: 0; text-align: center; font-size: 10px; color: #bbb; }

        .seat {
            width: 16px; height: 14px;
            border: 1px solid #bbb;
            font-size: 8px;
            display: flex; align-items: center; justify-content: center;
            background: #f5f5f5; color: #888;
            position: relative; cursor: default;
        }
        .seat.occupied { background: #2c2c2c; border-color: #2c2c2c; color: #fff; }
        .seat.vip      { background: #2c2c2c; border-color: #2c2c2c; color: #fff; }
        .seat.empty    { background: #fff; border: 1px solid #bbb; }
        .seat.wch      { background: #2c2c2c; border-color: #2c2c2c; color: #fff; }

        .seat-label {
            font-size: 7px; position: absolute; bottom: 0; right: 1px;
            color: #ccc; font-family: 'Barlow Condensed', sans-serif;
            font-weight: 600; line-height: 1;
        }

        .zone-tag {
            width: 16px; font-size: 9px; font-weight: 700; color: #888;
            text-align: left; padding-left: 4px;
            font-family: 'Barlow Condensed', sans-serif; flex-shrink: 0;
        }

        .col-header {
            display: flex; align-items: center;
            margin-bottom: 4px; padding-bottom: 2px;
            border-bottom: 1px solid #ccc;
        }
        .col-header .row-num { color: transparent; }
        .col-lbl {
            width: 16px; text-align: center; font-size: 10px;
            font-family: 'Barlow Condensed', sans-serif;
            font-weight: 700; color: #555;
        }

        .summary-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 6px; }
        .summary-table th {
            font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 11px;
            border-bottom: 1px solid #ccc; padding: 3px 6px 3px 0;
            text-align: left; color: #111; white-space: nowrap; border: none;
        }
        .summary-table td {
            padding: 2px 6px 2px 0; border-bottom: 0.5px solid #eee;
            color: #111; white-space: nowrap; border-left: none; border-right: none;
        }
        .summary-table tfoot td {
            font-weight: 700; border-top: 1px solid #ccc; border-bottom: none;
            font-family: 'Barlow Condensed', sans-serif; font-size: 12px; padding-top: 4px;
        }

        .manifest-footer {
            border-top: 1px solid #ccc; padding: 6px 12px;
            display: flex; justify-content: space-between;
            font-size: 10px; color: #888;
            font-family: 'Share Tech Mono', monospace;
        }
        .manifest-footer .sig-line {
            display: inline-block; border-bottom: 1px solid #ccc;
            width: 160px; margin-left: 4px;
        }

        .status-badge {
            font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
            font-size: 11px; letter-spacing: 1px;
            padding: 1px 6px; border: 1px solid currentColor; color: #2a7a2a;
        }

       @media print {
    .manifest-root { border: none; }

    .seat.occupied,
    .seat.vip,
    .seat.wch {
        background-color: #2c2c2c !important;
        border-color: #2c2c2c !important;
        color: #fff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    .seat.empty {
        background-color: #fff !important;
        border-color: #bbb !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
}`

type Data = ApiManifest
type Pax = Data['passengers']['rows'][number]
type Bag = Data['baggage']['rows'][number]

const blank = (n: number) => (n > 0 ? String(n) : '')
const num = (n: number) => String(Number(n.toFixed(2)))

const logo = (h: Data['header'], style: string) =>
  h.airline_logo ? `<img src="${e(h.airline_logo)}" alt="Logo" style="${style}">` : ''

const footer = (preparedBy: string) => `
    <div class="manifest-footer">
        <span>REMARKS: <span class="sig-line"></span></span>
        <span>
            PREPARED BY:
            ${e(preparedBy.trim().toUpperCase())}
            <span class="sig-line"></span>
        </span>
    </div>`

/** "OM223 &emsp; UBN - ICN &emsp; 2026-10-08 &emsp; 13:39 &emsp; [ETD: date &emsp;] 14:10" */
function flightLine(h: Data['header']) {
  let etd = ''
  if (h.etd_time) {
    etd = `${h.etd_date !== h.std_date ? `ETD: ${e(h.etd_date)} &emsp;` : ''} ${e(h.etd_time)}`
  }
  return `${e(h.flight_number)} &emsp; ${e(h.origin)} - ${e(h.destination)} &emsp; ${e(h.std_date)} &emsp; ${e(h.std_time)} &emsp; ${etd}`
}

function reportHeader(h: Data['header'], title: string, center = false) {
  return `
            <div class="header" style="display:flex; justify-content:center; align-items:center; padding-top:10px;">
                <table class="head" style="width:100%;${center ? ' text-align:center;' : ''} font-size:14px; border:none;">
                    <tr>
                        <td style="border:none; width:60px;">
                            ${logo(h, 'height:50px; margin-right:10px;')}
                        </td>
                        <td style="border:none;">
                            <p style="font-size:16px; font-weight:bold; margin:0;">${title}</p>
                            <p style="font-size:12px; margin:0;">${flightLine(h)}</p>
                        </td>
                    </tr>
                </table>
            </div>`
}

// ─── SEATMAP MANIFEST (W&B load distribution) ───
function balanceReport(data: Data, map: SeatMap, preparedBy: string) {
  const h = data.header
  // checked-in passengers on a seat (infants sit with their adult)
  const occupied = new Map(
    data.passengers.rows.filter((p) => p.seat_number && p.type !== 'INF').map((p) => [p.seat_number!.toUpperCase(), p])
  )

  // seat groups between the aisles, with the column letters
  const width = Math.max(...map.rows.map((r) => r.seats.length), 0)
  const letters: (string | null)[] = Array.from({ length: width }, (_, i) => {
    for (const row of map.rows) {
      const cell = row.seats[i]
      if (cell === 'aisle') return null
      if (cell) return cell.letter
    }
    return ''
  })
  const renderCells = (cell: (i: number, letter: string) => string, aisle: string) => {
    const parts: string[] = []
    let group: string[] = []
    letters.forEach((letter, i) => {
      if (letter === null) {
        parts.push(`<div class="seat-group">${group.join('')}</div>`, aisle)
        group = []
      } else {
        group.push(cell(i, letter))
      }
    })
    parts.push(`<div class="seat-group">${group.join('')}</div>`)
    return parts.join('')
  }

  const header = `
            <div class="col-header">
                <div class="row-num"></div>
                ${renderCells((_i, letter) => `<div class="col-lbl">${e(letter)}</div>`, '<div class="aisle"></div>')}
                <div class="zone-tag"></div>
            </div>`

  let lastZone: string | null = null
  let lastDisplayedZone: string | null = null
  const rows = map.rows
    .map((row) => {
      let out = ''
      const zone = row.zone
      if (zone && zone !== lastZone) {
        out += `<div class="zone-label">ZONE ${e(zone)}</div>`
        lastZone = zone
        lastDisplayedZone = null
      }
      const seatCell = (i: number) => {
        const cell = row.seats[i] as Seat | null
        if (!cell) return '<div style="width:16px;height:14px;"></div>'
        const pax = occupied.get(cell.number.toUpperCase())
        const ssr = pax ? pax.ssr.trim().toUpperCase() : ''
        return `<div style="display:flex; flex-direction:column; align-items:center;">
                                            <div class="seat ${pax ? 'occupied' : 'empty'}"></div>
                                            <span style="font-size:6px; color:#555; line-height:1;">${ssr ? e(ssr) : '&nbsp;'}</span>
                                        </div>`
      }
      const showZone = !!zone && zone !== lastDisplayedZone
      if (showZone) lastDisplayedZone = zone
      out += `
                <div class="seat-row">
                    <div class="row-num">${String(row.row).padStart(2, '0')}</div>
                    ${renderCells((i) => seatCell(i), '<div class="aisle">|</div>')}
                    <div class="zone-tag">${showZone ? e(zone) : ''}</div>
                </div>`
      return out
    })
    .join('')

  let tM = 0
  let tF = 0
  let tCHD = 0
  let tINF = 0
  let tPAX = 0
  const zoneRows = data.balance.rows
    .map((z) => {
      tM += z.male_adults
      tF += z.female_adults
      tCHD += z.children
      tINF += z.infants
      tPAX += z.total
      return `
                        <tr>
                            <td>${e(z.zone ?? '-')}</td>
                            <td>${z.male_adults}</td>
                            <td>${z.female_adults}</td>
                            <td>${blank(z.children)}</td>
                            <td>${blank(z.infants)}</td>
                            <td>${z.total}</td>
                            <td>${z.bags || ''}</td>
                            <td>${z.kg ? num(z.kg) : ''}</td>
                        </tr>`
    })
    .join('')

  const ssrCounts = new Map<string, number>()
  for (const p of occupied.values()) {
    for (const code of p.ssr.toUpperCase().split(/\s+/).filter(Boolean)) {
      ssrCounts.set(code, (ssrCounts.get(code) ?? 0) + 1)
    }
  }
  const bags = data.balance.totals

  return `
<div class="manifest-root">

    <div class="manifest-subheader">
        <div class="logo-box">
            ${logo(h, 'height:38px; vertical-align:middle; margin-right:6px;')}
        </div>
        <div class="flight-info">
            <span>${e(h.airline || 'AIRLINE')} — SEATMAP MANIFEST (LOAD DISTRIBUTION)</span><br>
            <b>${e(h.flight_number)} | ${e(h.origin)} → ${e(h.destination)} | ${e(h.std_date)}</b><br>
            STD ${e(h.std_time)}
            ${h.etd_time ? `&emsp;ETD ${h.etd_date !== h.std_date ? e(h.etd_date) : ''} ${e(h.etd_time)}` : ''}
        </div>
        <div class="right">
            Aircraft: ${e(h.aircraft_type ?? '')}<br>
            Reg: ${e(h.registration ?? '')}<br>
        </div>
    </div>

    <div class="manifest-body">
        <div class="seatmap-col">
            ${header}
            ${rows}

            <div style="margin-top:10px; border-top:1px solid #ccc; padding-top:6px;">
                <table class="summary-table">
                    <thead>
                        <tr>
                            <th>ZONE</th><th>M</th><th>F</th><th>CHD</th>
                            <th>INF</th><th>PAX</th><th>BAGS</th><th>KG</th>
                        </tr>
                    </thead>
                    <tbody>${zoneRows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>TOTAL</td>
                            <td>${tM}</td><td>${tF}</td>
                            <td>${blank(tCHD)}</td>
                            <td>${blank(tINF)}</td>
                            <td>${tPAX}</td>
                            <td>${bags.bags}</td>
                            <td>${num(bags.kg)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        <div class="stats-col">
            <div class="stats-section">
                <div class="s-label">PASSENGERS</div>
                <p>ADT ${tM + tF}</p>
                <p>M ${tM} / F ${tF}</p>
                ${tCHD > 0 ? `<p>CHD ${tCHD}</p>` : ''}
                ${tINF > 0 ? `<p>INF ${tINF}</p>` : ''}
                <p>PAX+INF ${tM + tF + tCHD + tINF}</p>
            </div>
            <div class="stats-section">
                <div class="s-label">BAGGAGE</div>
                <p>${bags.bags} PCS / ${num(bags.kg)} KG</p>
            </div>
            ${
              ssrCounts.size
                ? `<div class="stats-section">
                <div class="s-label">SSR</div>
                ${[...ssrCounts].map(([code, count]) => `<p>${e(code)} ${count}</p>`).join('')}
            </div>`
                : ''
            }
        </div>
    </div>
    ${footer(preparedBy)}
</div>`
}

// ─── PASSENGER MANIFEST ───
function passengerReport(data: Data, preparedBy: string) {
  const rows = data.passengers.rows
  const t = data.passengers.totals
  let count = 0
  let weight = 0
  const body = rows
    .map((p: Pax, index) => {
      count += p.bag_pieces
      weight += p.bag_weight_kg
      return `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${p.online_no_bags ? '* ' : ''}${e(p.last_name)} / ${e(p.first_name)}</td>
                                <td>${e(p.gdr)}</td>
                                <td>${e(p.nationality ?? '')}</td>
                                <td>${e(p.date_of_birth ?? '')}</td>
                                <td>${e(p.seat_number ?? '')}</td>
                                <td>${p.bag_weight_kg > 0 ? num(p.bag_weight_kg) : '-'}</td>
                                <td>${p.bag_pieces || ''}</td>
                                <td>${e(p.ssr)}</td>
                                <td>${e(p.remark ?? '')}</td>
                            </tr>`
    })
    .join('')

  return `
            ${reportHeader(data.header, 'Passenger Manifest')}
            <div class="content" style="padding-bottom:60px;">
                <table>
                    <thead style="font-size:10px;">
                        <tr>
                            <th>№</th>
                            <th>NAME</th>
                            <th>GDR</th>
                            <th>NATIONALITY</th>
                            <th>DOB</th>
                            <th>SEAT</th>
                            <th>KG</th>
                            <th>BAGGAGES</th>
                            <th>SSR</th>
                            <th>RES REMARK</th>
                        </tr>
                    </thead>
                    <tbody>${body}
                        <tr>
                            <th rowspan="2">Total</th>
                            <th>ADT: ${t.ADT} CHD: ${t.CHD} INF: ${t.INF}</th>
                            <th colspan="4"></th>
                            <th>Weight: ${num(weight)} KG</th>
                            <th>Count: ${count}</th>
                            <th colspan="2"></th>
                        </tr>
                    </tbody>
                </table>
                ${footer(preparedBy)}
            </div>`
}

// ─── BAGGAGE MANIFEST ───
function baggageReport(data: Data, preparedBy: string) {
  // check-in group → passenger → bags (a passenger without a group is a group of one, crew bags too)
  const groups = new Map<string, Map<string, Bag[]>>()
  for (const bag of data.baggage.rows) {
    const owner = bag.segment_id ? `p${bag.segment_id}` : `c${bag.id}`
    const key = bag.checkin_group_id ? `g${bag.checkin_group_id}` : owner
    const group = groups.get(key) ?? new Map<string, Bag[]>()
    group.set(owner, [...(group.get(owner) ?? []), bag])
    groups.set(key, group)
  }

  let number = 0
  let totalQty = 0
  let totalKg = 0
  const body = [...groups.values()]
    .map((owners) => {
      number++
      // one row per bag tag, like the legacy one row per bag
      const tagRows = (bags: Bag[]) =>
        bags.flatMap((b) => (b.tags.length ? b.tags : ['']).map((tag) => ({ tag, bag: b })))
      const groupRows = [...owners.values()].reduce((n, bags) => n + tagRows(bags).length, 0)
      let firstGroupRow = true
      return [...owners.values()]
        .map((bags) => {
          const rows = tagRows(bags)
          const qty = bags.reduce((s, b) => s + b.pieces, 0)
          const kg = bags.reduce((s, b) => s + b.weight_kg, 0)
          totalQty += qty
          totalKg += kg
          const first = bags[0]
          return rows
            .map(({ tag, bag }, i) => {
              let cells = ''
              if (firstGroupRow) {
                cells += `<td rowspan="${groupRows}">${number}</td>`
                firstGroupRow = false
              }
              cells += `<td>${e(tag)}</td>`
              if (i === 0) {
                cells += `
                                        <td rowspan="${rows.length}">${e(first.passenger.replace('/', ' / '))}</td>
                                        <td rowspan="${rows.length}">${e(first.seat_number ?? '')}</td>
                                        <td rowspan="${rows.length}">${e(first.cabin_class ?? '')}</td>
                                        <td rowspan="${rows.length}">${qty}</td>
                                        <td rowspan="${rows.length}">${num(kg)}</td>`
              }
              cells += `<td>${e(bag.description ?? '')}</td>`
              return `<tr>${cells}</tr>`
            })
            .join('')
        })
        .join('')
    })
    .join('')

  return `
            ${reportHeader(data.header, 'Baggage Manifest', true)}
            <div class="content" style="padding-bottom:60px;">
                <table class="table table-bordered table-hover table-checkable">
                    <thead style="font-size:10px;">
                        <tr>
                            <th>№</th>
                            <th>Baggage Number</th>
                            <th>PASSENGER NAME</th>
                            <th>SEAT</th>
                            <th>CLASS</th>
                            <th>QTY</th>
                            <th>KG</th>
                            <th>DCS REMARK</th>
                        </tr>
                    </thead>
                    <tbody>${body}
                    <tr>
                        <th colspan="5">Total</th>
                        <th>${totalQty}</th>
                        <th>${num(totalKg)}</th>
                        <th></th>
                    </tr>
                    </tbody>
                </table>
                ${footer(preparedBy)}
            </div>`
}

const copies = (n: number, page: () => string) =>
  Array.from(
    { length: Math.max(0, n) },
    (_, i) => `<div class="page-container" style="${i > 0 ? 'page-break-before: always;' : ''}">${page()}</div>`
  ).join('')

/** One HTML document with every chosen report; each report starts on a new page */
export function manifestDocument(data: Data, map: SeatMap, options: ManifestOptions) {
  const sections = [
    options.balance > 0 && copies(options.balance, () => balanceReport(data, map, options.preparedBy)),
    options.passengers > 0 &&
      data.passengers.rows.length > 0 &&
      copies(options.passengers, () => passengerReport(data, options.preparedBy)),
    options.baggage > 0 &&
      data.baggage.rows.length > 0 &&
      copies(options.baggage, () => baggageReport(data, options.preparedBy)),
  ].filter((s): s is string => !!s)

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${e(data.header.flight_number)} manifest</title>
    <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@400;600;700&display=swap" rel="stylesheet">
    <style>${STYLE}</style>
</head>
<body>
${sections.map((s, i) => `<div class="content" style="${i > 0 ? 'page-break-before: always;' : ''}">${s}</div>`).join('\n')}
</body>
</html>`
}
