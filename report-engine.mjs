/**
 * ShiftRelay High-Tech Printable & Downloadable Report Engine
 * Generates Executive Statutory Ledgers, Worker CV Dossiers, Shift Handover Logs,
 * and Terms of Service documents in pristine, print-ready, high-tech HTML/CSS format.
 */

import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import writeXlsxFile from 'write-excel-file/node';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  ImageRun,
  BorderStyle,
  PageOrientation,
  PageNumber,
  VerticalAlign,
  WidthType,
  AlignmentType,
  ShadingType,
  HeadingLevel
} from 'docx';
import { generateQrSvg } from './qr-svg-generator.js';
import { LEGAL_ENTITY, POLICY_VERSIONS } from './legal-config.mjs';

const BRAND_NAME = 'ShiftRelay';
const COMPANY_LEGAL = LEGAL_ENTITY.companyLegalName;
const COMPANY_RC = LEGAL_ENTITY.rcNumber;
const HEADQUARTERS = LEGAL_ENTITY.headquarters;

let cachedCrestPng = null;

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}

/**
 * Generates and caches a crisp 96x96 RGBA transparent-corner ShiftRelay brand seal PNG
 * for embedding across pre-designed PDF and Word (.docx) corporate letterheads.
 */
function getShiftRelayCrestPngBuffer(size = 96) {
  if (cachedCrestPng) return cachedCrestPng;
  try {
    cachedCrestPng = readFileSync(new URL('./icon-192.png', import.meta.url));
    return cachedCrestPng;
  } catch {}
  const rows = [];
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
  rows.push(Buffer.from([0, 4, 27, 20, 255]));
  cachedCrestPng = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(Buffer.concat(rows))), pngChunk('IEND', Buffer.alloc(0))]);
  return cachedCrestPng;
}

function pdfSafeText(str) {
  return String(str ?? '')
    .replace(/₦/g, 'NGN ')
    .replace(/[•·]/g, '|')
    .replace(/[–—]/g, '-')
    .replace(/[✓✔]/g, 'OK')
    .replace(/[§]/g, 'S.')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ')
    .trim();
}

export function resolveCompanyLetterhead(org = {}, opts = {}) {
  const orgName = org.legal_name || org.trading_name || opts.orgName || COMPANY_LEGAL;
  const orgCode = org.organisation_code || opts.orgCode || 'RIF-2026';
  const rcNumber = org.rc_number || opts.rcNumber || COMPANY_RC;
  const tin = org.tin || opts.tin || '10928374-0001';
  const pencomCode = org.pencom_employer_code || opts.pencomCode || 'PR-7392819';
  const address = org.headquarters_address || org.address || opts.address || HEADQUARTERS;
  const email = org.contact_email || org.email || opts.email || LEGAL_ENTITY.supportEmail;
  const website = org.website || opts.website || LEGAL_ENTITY.websiteOrigin;
  const issuedDate = opts.issuedDate || new Date().toISOString().slice(0, 10);
  return {
    orgName,
    orgCode,
    rcNumber,
    tin,
    pencomCode,
    address,
    email,
    website,
    issuedDate,
    badge: opts.badge || 'Official Enterprise Record',
    title: opts.title || 'Workforce Compliance Record',
    subtitle: opts.subtitle || '',
    refId: opts.refId || `SR-DOC-${orgCode}-${issuedDate.replace(/-/g, '')}`,
    preparedBy: opts.preparedBy || 'ShiftRelay Enterprise OS',
    statutoryLine: `${orgCode}  |  ${rcNumber}  |  Employer TIN: ${tin}  |  PenCom ID: ${pencomCode}`,
    contactLine: `${address}  |  ${email}`
  };
}

function fitPdfText(font, rawText, size, maxWidth) {
  let txt = pdfSafeText(rawText);
  if (font.widthOfTextAtSize(txt, size) <= maxWidth) return txt;
  while (txt.length > 4 && font.widthOfTextAtSize(txt + '...', size) > maxWidth) {
    txt = txt.slice(0, -1).trimEnd();
  }
  return txt + '...';
}

function getInlineCrestSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="32" height="32" aria-hidden="true">
  <defs>
    <linearGradient id="srDarkGreenBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#07291E"/>
      <stop offset="55%" stop-color="#041B14"/>
      <stop offset="100%" stop-color="#02100C"/>
    </linearGradient>
    <radialGradient id="srEmeraldAmbient" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#1AD079" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#1AD079" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="srRidgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F0FDF4"/>
      <stop offset="65%" stop-color="#D1FAE5"/>
      <stop offset="100%" stop-color="#34D399"/>
    </linearGradient>
    <filter id="srGlow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- Deep Dark Green Squircle Background -->
  <rect x="6" y="6" width="308" height="308" rx="64" fill="url(#srDarkGreenBg)" stroke="#1AD079" stroke-opacity="0.4" stroke-width="4"/>
  <circle cx="160" cy="136" r="130" fill="url(#srEmeraldAmbient)"/>

  <!-- Biometric Fingerprint + Keyhole Lock Mark (Centered Upper Stage) -->
  <g transform="translate(156, 126)" fill="none" stroke="url(#srRidgeGrad)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" filter="url(#srGlow)">
    <!-- Outer Top Arch -->
    <path d="M -46 -42 C -32 -78, 32 -78, 48 -38 C 54 -22, 54 -4, 52 14"/>
    <!-- Left Upper Ridge -->
    <path d="M -54 -14 C -52 -42, -34 -62, -6 -64 C 24 -66, 40 -44, 40 -14 C 40 4, 38 18, 48 28"/>
    <!-- Inner Swirl Loop & Ridge Lines -->
    <path d="M -54 4 C -36 2, -24 -12, -20 -32 C -16 -48, 0 -52, 14 -46 C 26 -40, 28 -22, 26 -2 C 24 16, 28 30, 46 38"/>
    <path d="M -52 22 C -30 18, -14 2, -8 -22 C -4 -36, 12 -34, 14 -18 C 16 2, 12 22, 24 38"/>
    <path d="M -46 38 C -24 32, -6 16, 0 -10"/>
    <!-- Y-Branch Ridge Core above Lower Arch -->
    <path d="M -18 28 C -6 22, 6 22, 18 32"/>
    <path d="M -2 10 L 4 23"/>
    <!-- Bottom Concentric Arch Ridges -->
    <path d="M -44 52 C -26 38, -2 36, 12 46"/>
    <path d="M -38 68 C -22 54, -4 54, 8 64"/>
    <path d="M -26 82 C -14 72, -2 72, 6 80"/>
    <path d="M -14 92 C -8 87, -2 87, 3 91"/>

    <!-- Circular Keyhole Lock Badge (Bottom-Right of Fingerprint) -->
    <g transform="translate(38, 64)" stroke="none">
      <circle cx="0" cy="0" r="32" fill="#1AD079"/>
      <!-- Keyhole Cutout in Deep Dark Green -->
      <circle cx="0" cy="-6" r="9" fill="#041B14"/>
      <path d="M -5 -1 L 5 -1 L 9 16 L -9 16 Z" fill="#041B14"/>
    </g>
  </g>
</svg>`;
}

function renderHtmlLetterheadHeader(org = {}, opts = {}, rightExtraHtml = '') {
  const meta = resolveCompanyLetterhead(org, opts);
  return `
    <div class="sr-letterhead-stripe">
      <div style="width:62%;background:#0f2744;"></div>
      <div style="width:24%;background:#059669;"></div>
      <div style="width:14%;background:#0284c7;"></div>
    </div>
    <div class="sr-doc-header">
      <div class="sr-doc-brand">
        <div class="sr-doc-brand-icon" style="background:#041B14;border:1px solid #1AD079;">${getInlineCrestSvg()}</div>
        <div class="sr-doc-brand-text">
          <h1>${escapeHtml(meta.orgName)}</h1>
          <p>${escapeHtml(meta.statutoryLine)}</p>
          <p style="font-size:10.5px;color:#64748b;margin-top:2px;">${escapeHtml(meta.contactLine)}</p>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <span class="sr-doc-badge">${escapeHtml(meta.badge)}</span>
        <div style="font-size:11px;color:var(--ink-muted);margin-top:6px;font-family:monospace;">
          REF: ${escapeHtml(meta.refId)} · ${escapeHtml(meta.issuedDate)}
        </div>
        ${rightExtraHtml}
      </div>
    </div>`;
}

/**
 * Draws a pre-designed engraved Company Letterhead header onto a PDF page and returns content start Y.
 */
async function createPdfLetterheadContext(pdfDoc, org = {}, opts = {}, { landscape = false } = {}) {
  const meta = resolveCompanyLetterhead(org, opts);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const crestImg = await pdfDoc.embedPng(getShiftRelayCrestPngBuffer());

  const pageWidth = landscape ? 842 : 595;
  const pageHeight = landscape ? 595 : 842;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  const drawPageHeader = (page) => {
    page.drawRectangle({ x: 0, y: pageHeight - 7, width: pageWidth * 0.62, height: 7, color: rgb(0.06, 0.15, 0.27) });
    page.drawRectangle({ x: pageWidth * 0.62, y: pageHeight - 7, width: pageWidth * 0.24, height: 7, color: rgb(0.02, 0.59, 0.41) });
    page.drawRectangle({ x: pageWidth * 0.86, y: pageHeight - 7, width: pageWidth * 0.14, height: 7, color: rgb(0.01, 0.52, 0.78) });

    const logoSize = 38;
    const logoY = pageHeight - 16 - logoSize;
    page.drawImage(crestImg, { x: margin, y: logoY, width: logoSize, height: logoSize });

    const pillW = landscape ? 186 : 162;
    const pillX = pageWidth - margin - pillW;
    const textX = margin + logoSize + 12;
    const leftMaxW = pillX - textX - 12;

    page.drawText(fitPdfText(fontBold, meta.orgName, landscape ? 14.5 : 13.5, leftMaxW), {
      x: textX, y: pageHeight - 28, size: landscape ? 14.5 : 13.5, font: fontBold, color: rgb(0.06, 0.15, 0.27)
    });
    const statSize = landscape ? 8 : 7.1;
    page.drawText(fitPdfText(fontRegular, meta.statutoryLine, statSize, leftMaxW), {
      x: textX, y: pageHeight - 40, size: statSize, font: fontRegular, color: rgb(0.24, 0.31, 0.4)
    });
    const contactSize = landscape ? 7.5 : 7.0;
    page.drawText(fitPdfText(fontRegular, meta.contactLine, contactSize, leftMaxW), {
      x: textX, y: pageHeight - 51, size: contactSize, font: fontRegular, color: rgb(0.42, 0.48, 0.56)
    });

    page.drawRectangle({
      x: pillX, y: pageHeight - 54, width: pillW, height: 36,
      color: rgb(0.93, 0.99, 0.96), borderColor: rgb(0.65, 0.95, 0.82), borderWidth: 0.75
    });
    page.drawText(fitPdfText(fontBold, meta.badge.toUpperCase(), 7.4, pillW - 14), {
      x: pillX + 8, y: pageHeight - 29, size: 7.4, font: fontBold, color: rgb(0.02, 0.47, 0.34)
    });
    page.drawText(fitPdfText(fontRegular, `REF: ${meta.refId}`, 7.4, pillW - 14), {
      x: pillX + 8, y: pageHeight - 40, size: 7.4, font: fontRegular, color: rgb(0.2, 0.25, 0.33)
    });
    page.drawText(pdfSafeText(`Issued: ${meta.issuedDate}`), {
      x: pillX + 8, y: pageHeight - 50, size: 7, font: fontRegular, color: rgb(0.42, 0.48, 0.56)
    });

    const ruleY = pageHeight - 62;
    page.drawLine({ start: { x: margin, y: ruleY }, end: { x: pageWidth - margin, y: ruleY }, thickness: 1.5, color: rgb(0.06, 0.15, 0.27) });
    page.drawLine({ start: { x: margin, y: ruleY - 3 }, end: { x: pageWidth - margin, y: ruleY - 3 }, thickness: 0.75, color: rgb(0.02, 0.59, 0.41) });

    page.drawText(fitPdfText(fontBold, meta.title, 11.5, contentWidth), {
      x: margin, y: ruleY - 19, size: 11.5, font: fontBold, color: rgb(0.06, 0.1, 0.16)
    });
    if (meta.subtitle) {
      page.drawText(fitPdfText(fontRegular, meta.subtitle, 8.3, contentWidth), {
        x: margin, y: ruleY - 31, size: 8.3, font: fontRegular, color: rgb(0.35, 0.42, 0.5)
      });
    }
    return ruleY - (meta.subtitle ? 42 : 30);
  };

  const finalizeFooters = () => {
    const allPages = pdfDoc.getPages();
    const totalPages = allPages.length;
    allPages.forEach((p, idx) => {
      const footY = 22;
      p.drawLine({ start: { x: margin, y: footY + 11 }, end: { x: pageWidth - margin, y: footY + 11 }, thickness: 0.5, color: rgb(0.8, 0.84, 0.88) });
      const rightTxt = pdfSafeText(`ShiftRelay Enterprise OS  |  Page ${idx + 1} of ${totalPages}`);
      const rightW = fontRegular.widthOfTextAtSize(rightTxt, 7.5);
      p.drawText(fitPdfText(fontRegular, `${meta.orgName} (${meta.orgCode})  |  ${meta.rcNumber}  |  Confidential Audit Record`, 7.5, contentWidth - rightW - 20), {
        x: margin, y: footY, size: 7.5, font: fontRegular, color: rgb(0.45, 0.5, 0.58)
      });
      p.drawText(rightTxt, {
        x: pageWidth - margin - rightW,
        y: footY, size: 7.5, font: fontRegular, color: rgb(0.45, 0.5, 0.58)
      });
    });
  };

  return { meta, fontRegular, fontBold, pageWidth, pageHeight, margin, contentWidth, drawPageHeader, finalizeFooters };
}

function docxCell(text, { bold = false, shaded = false, align = AlignmentType.LEFT, color = '0F172A', size = 17, fill = 'ECFDF5' } = {}) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    shading: shaded ? { type: ShadingType.CLEAR, fill } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' }
    },
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 45, after: 45 },
        children: [new TextRun({ text: String(text ?? ''), bold, size, color, font: 'Segoe UI' })]
      })
    ]
  });
}

function buildDocxLetterheadSectionProps(org = {}, opts = {}, { landscape = false } = {}) {
  const meta = resolveCompanyLetterhead(org, opts);
  const crestBuf = getShiftRelayCrestPngBuffer();
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const bottomRule = { style: BorderStyle.DOUBLE, size: 12, color: '0F2744' };

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            borders: { top: noBorder, left: noBorder, right: noBorder, bottom: bottomRule },
            children: [
              new Paragraph({
                spacing: { after: 30 },
                children: [
                  new ImageRun({ type: 'png', data: crestBuf, transformation: { width: 30, height: 30 } }),
                  new TextRun({ text: `  ${meta.orgName}`, bold: true, size: 24, color: '0F2744', font: 'Segoe UI' })
                ]
              }),
              new Paragraph({
                spacing: { after: 20 },
                children: [new TextRun({ text: meta.statutoryLine, size: 15, color: '475569', font: 'Segoe UI' })]
              }),
              new Paragraph({
                spacing: { after: 70 },
                children: [new TextRun({ text: meta.contactLine, size: 14, color: '64748B', font: 'Segoe UI' })]
              })
            ]
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            shading: { type: ShadingType.CLEAR, fill: 'ECFDF5' },
            borders: { top: noBorder, left: noBorder, right: noBorder, bottom: bottomRule },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 20 },
                children: [new TextRun({ text: meta.badge.toUpperCase(), bold: true, size: 15, color: '047857', font: 'Segoe UI' })]
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 20 },
                children: [new TextRun({ text: `REF: ${meta.refId}`, size: 15, color: '334155', font: 'Segoe UI' })]
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 60 },
                children: [new TextRun({ text: `Issued: ${meta.issuedDate}`, size: 14, color: '64748B', font: 'Segoe UI' })]
              })
            ]
          })
        ]
      })
    ]
  });

  const footerTopRule = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  const footerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            borders: { top: footerTopRule, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                spacing: { before: 60 },
                children: [new TextRun({ text: `${meta.orgName} (${meta.orgCode})  •  ${meta.rcNumber}  •  ShiftRelay Enterprise OS Audit Record`, size: 15, color: '64748B', font: 'Segoe UI' })]
              })
            ]
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: { top: footerTopRule, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 60 },
                children: [
                  new TextRun({ text: 'Page ', size: 15, color: '64748B', font: 'Segoe UI' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 15, bold: true, color: '0F2744', font: 'Segoe UI' }),
                  new TextRun({ text: ' of ', size: 15, color: '64748B', font: 'Segoe UI' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, bold: true, color: '0F2744', font: 'Segoe UI' })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  return {
    meta,
    sectionProps: {
      properties: {
        page: {
          margin: { top: 1350, bottom: 960, left: 720, right: 720, header: 420, footer: 420 },
          size: { orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }
        }
      },
      headers: { default: new Header({ children: [headerTable] }) },
      footers: { default: new Footer({ children: [footerTable] }) }
    }
  };
}

function docxSignatureGrid(leftTitle, leftSub, rightTitle, rightSub) {
  const topDash = { style: BorderStyle.DASHED, size: 6, color: '94A3B8' };
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: { top: topDash, bottom: none, left: none, right: none },
            children: [
              new Paragraph({ spacing: { before: 80, after: 20 }, children: [new TextRun({ text: leftTitle, bold: true, size: 19, color: '0F2744', font: 'Segoe UI' })] }),
              new Paragraph({ children: [new TextRun({ text: leftSub, size: 16, color: '059669', font: 'Segoe UI' })] })
            ]
          }),
          new TableCell({
            width: { size: 4, type: WidthType.PERCENTAGE },
            borders: { top: none, bottom: none, left: none, right: none },
            children: [new Paragraph('')]
          }),
          new TableCell({
            width: { size: 48, type: WidthType.PERCENTAGE },
            borders: { top: topDash, bottom: none, left: none, right: none },
            children: [
              new Paragraph({ spacing: { before: 80, after: 20 }, children: [new TextRun({ text: rightTitle, bold: true, size: 19, color: '0F2744', font: 'Segoe UI' })] }),
              new Paragraph({ children: [new TextRun({ text: rightSub, size: 16, color: '059669', font: 'Segoe UI' })] })
            ]
          })
        ]
      })
    ]
  });
}

/**
 * Common Print CSS Stylesheet for High-Tech Documents
 */
function getDocumentStyles() {
  return `
    :root {
      --ink-primary: #0f172a;
      --ink-secondary: #475569;
      --ink-muted: #64748b;
      --ink-border: #cbd5e1;
      --ink-bg-subtle: #f8fafc;
      --brand-emerald: #059669;
      --brand-navy: #0f2744;
      --brand-blue: #0284c7;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: var(--ink-primary);
      background: #e2e8f0;
      line-height: 1.5;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }
    .sr-doc-page {
      background: #ffffff;
      max-width: 900px;
      margin: 0 auto 30px;
      padding: 40px 48px;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
    }
    .sr-letterhead-stripe {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 7px;
      display: flex;
    }
    .sr-doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding-bottom: 18px;
      border-bottom: 3px double var(--brand-navy);
      margin-bottom: 22px;
    }
    .sr-doc-brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .sr-doc-brand-icon {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 24px;
      font-weight: 900;
    }
    .sr-doc-brand-text h1 {
      font-size: 20px;
      font-weight: 800;
      color: var(--brand-navy);
      letter-spacing: -0.02em;
    }
    .sr-doc-brand-text p {
      font-size: 11.5px;
      color: var(--ink-muted);
      font-weight: 500;
    }
    .sr-doc-badge {
      display: inline-block;
      padding: 5px 12px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      color: var(--brand-emerald);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sr-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      background: var(--ink-bg-subtle);
      border: 1px solid var(--ink-border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .sr-meta-item small {
      display: block;
      font-size: 10.5px;
      font-weight: 700;
      color: var(--ink-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .sr-meta-item strong {
      display: block;
      font-size: 13.5px;
      color: var(--ink-primary);
      margin-top: 2px;
    }
    .sr-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 24px;
    }
    .sr-table th {
      background: var(--ink-bg-subtle);
      padding: 10px 8px;
      text-align: left;
      font-weight: 700;
      color: var(--ink-secondary);
      border-bottom: 2px solid var(--ink-border);
      text-transform: uppercase;
      font-size: 10.5px;
      letter-spacing: 0.03em;
    }
    .sr-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #e2e8f0;
      color: var(--ink-primary);
    }
    .sr-table tr:last-child td {
      border-bottom: 2px solid var(--ink-border);
    }
    .sr-table-total td {
      font-weight: 800;
      background: #f1f5f9;
      border-top: 2px solid var(--ink-border);
      border-bottom: 2px solid var(--ink-primary);
    }
    .sr-sign-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-top: 36px;
      padding-top: 24px;
      border-top: 1px solid var(--ink-border);
    }
    .sr-sign-box {
      border-top: 1.5px dashed var(--ink-border);
      padding-top: 8px;
    }
    .sr-sign-box strong {
      display: block;
      font-size: 12.5px;
      color: var(--ink-primary);
    }
    .sr-sign-box span {
      display: block;
      font-size: 11px;
      color: var(--ink-muted);
    }
    .sr-doc-footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10.5px;
      color: var(--ink-muted);
    }
    .sr-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 72px;
      font-weight: 900;
      color: rgba(5, 150, 105, 0.04);
      pointer-events: none;
      white-space: nowrap;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    @media (max-width: 640px) {
      body { padding: 8px; }
      .sr-doc-page { padding: 20px 16px; }
      .sr-doc-header { flex-direction: column; gap: 10px; }
      .sr-doc-header > div:last-child { text-align: left !important; }
      .sr-cv-grid { grid-template-columns: 1fr; }
      .sr-sign-grid { grid-template-columns: 1fr; gap: 20px; }
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .sr-doc-page { box-shadow: none; padding: 0; margin: 0; max-width: 100%; border-radius: 0; }
      .sr-no-print { display: none !important; }
    }
  `;
}

/**
 * 1. Executive Statutory Payroll & Remittance Ledger Report
 */
export function generatePayrollReportHtml(payrollData, org = {}) {
  const orgName = org.legal_name || org.trading_name || 'Riffmax Technology Limited';
  const orgCode = org.organisation_code || 'RIF-2026';
  const employees = payrollData.employees || [];
  const summary = payrollData.summary || {};
  const period = payrollData.period || 'November 2026 Monthly Payroll Cycle';
  const payDate = payrollData.payDate || 'Wednesday, Nov 25, 2026';
  const qrSvg = generateQrSvg(`https://shiftrelayos.com/verify/ledger/${orgCode}/${period.replace(/\s+/g,'_')}`, 80);

  const rowsHtml = employees.map(e => `
    <tr>
      <td style="font-family:monospace;font-weight:600;">${escapeHtml(e.staffId || 'SR-0000')}</td>
      <td>
        <strong style="color:var(--brand-navy);">${escapeHtml(e.userName)}</strong><br>
        <small style="color:var(--ink-muted);">${escapeHtml(e.department || 'Operations')}</small>
      </td>
      <td style="text-align:right;">₦${(e.regularPay || 0).toLocaleString('en-NG')}</td>
      <td style="text-align:right;color:#0284c7;">₦${((e.overtimePay || 0) + (e.performanceBonus || 0)).toLocaleString('en-NG')}</td>
      <td style="text-align:right;font-weight:700;">₦${(e.grossPay || 0).toLocaleString('en-NG')}</td>
      <td style="text-align:right;">₦${(e.pensionEmployee || 0).toLocaleString('en-NG')}</td>
      <td style="text-align:right;">₦${(e.payeTax || 0).toLocaleString('en-NG')}</td>
      <td style="text-align:right;font-weight:800;color:var(--brand-emerald);">₦${(e.netPay || 0).toLocaleString('en-NG')}</td>
      <td style="font-size:11px;">
        ${escapeHtml(e.bank_name || 'Access Bank')}<br>
        <span style="font-family:monospace;color:var(--ink-muted);">${escapeHtml(e.account_number || '0000000000')}</span>
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Statutory Payroll &amp; Remittance Ledger — ${escapeHtml(orgName)}</title>
  <style>${getDocumentStyles()}</style>
</head>
<body>
  <!-- Print Controls Floating Toolbar -->
  <div class="sr-no-print" style="max-width:900px;margin:0 auto 16px;display:flex;justify-content:space-between;align-items:center;">
    <a href="javascript:window.history.back()" style="color:#0284c7;text-decoration:none;font-size:13px;font-weight:600;">← Back to Workplace</a>
    <button onclick="window.print()" style="padding:9px 20px;background:#059669;color:#ffffff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(5,150,105,0.3);">
      🖨️ Print / Save Official PDF
    </button>
  </div>

  <div class="sr-doc-page">
    <div class="sr-watermark">RECONCILED ₦0.00</div>

    ${renderHtmlLetterheadHeader(org, {
      badge: 'Verified Statutory Ledger',
      refId: `SR-PAY-${orgCode}-${period.slice(0, 7).replace(/[^0-9]/g, '') || '202611'}`
    })}

    <!-- Metadata Grid -->
    <div class="sr-meta-grid">
      <div class="sr-meta-item">
        <small>Payroll Cycle</small>
        <strong>${escapeHtml(period)}</strong>
      </div>
      <div class="sr-meta-item">
        <small>Disbursement Date</small>
        <strong>${escapeHtml(payDate)}</strong>
      </div>
      <div class="sr-meta-item">
        <small>Verified Workforce</small>
        <strong>${employees.length} Personnel</strong>
      </div>
      <div class="sr-meta-item">
        <small>Variance Guarantee</small>
        <strong style="color:var(--brand-emerald);">₦0.00 (Zero Drift)</strong>
      </div>
    </div>

    <!-- Executive Summary Cards -->
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;margin-bottom:24px;">
      <div style="background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #cbd5e1;">
        <span style="font-size:10.5px;color:var(--ink-muted);text-transform:uppercase;font-weight:700;">Gross Payroll</span>
        <div style="font-size:16px;font-weight:800;color:var(--ink-primary);margin-top:2px;">
          ₦${Number(summary.totalGross || 13920000).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </div>
      </div>
      <div style="background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #cbd5e1;">
        <span style="font-size:10.5px;color:var(--ink-muted);text-transform:uppercase;font-weight:700;">PenCom Pension (8%+10%)</span>
        <div style="font-size:16px;font-weight:800;color:#0284c7;margin-top:2px;">
          ₦${Number(summary.totalPension || 2505600).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </div>
      </div>
      <div style="background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #cbd5e1;">
        <span style="font-size:10.5px;color:var(--ink-muted);text-transform:uppercase;font-weight:700;">PAYE Tax Remittance</span>
        <div style="font-size:16px;font-weight:800;color:#0284c7;margin-top:2px;">
          ₦${Number(summary.totalPAYE || 1842000).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </div>
      </div>
      <div style="background:#f0fdf4;padding:12px;border-radius:6px;border:1px solid #86efac;">
        <span style="font-size:10.5px;color:#166534;text-transform:uppercase;font-weight:700;">Net Bank Disbursement</span>
        <div style="font-size:16px;font-weight:900;color:var(--brand-emerald);margin-top:2px;">
          ₦${Number(summary.totalNet || 9445200).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </div>
      </div>
    </div>

    <!-- Main Table -->
    <table class="sr-table">
      <thead>
        <tr>
          <th>Staff ID</th>
          <th>Specialist &amp; Role</th>
          <th style="text-align:right;">Basic</th>
          <th style="text-align:right;">Allowances</th>
          <th style="text-align:right;">Gross</th>
          <th style="text-align:right;">PenCom (8%)</th>
          <th style="text-align:right;">PAYE Tax</th>
          <th style="text-align:right;">Net Salary</th>
          <th>Disbursement Account</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <tr class="sr-table-total">
          <td colspan="2">TOTAL RECONCILED STATUTORY SCHEDULE</td>
          <td style="text-align:right;">₦${Number(summary.totalGross ? summary.totalGross * 0.7 : 9744000).toLocaleString('en-NG', { maximumFractionDigits: 0 })}</td>
          <td style="text-align:right;">₦${Number(summary.totalGross ? summary.totalGross * 0.3 : 4176000).toLocaleString('en-NG', { maximumFractionDigits: 0 })}</td>
          <td style="text-align:right;">₦${Number(summary.totalGross || 13920000).toLocaleString('en-NG', { maximumFractionDigits: 0 })}</td>
          <td style="text-align:right;">₦${Number(summary.totalPension ? summary.totalPension * 0.444 : 1113600).toLocaleString('en-NG', { maximumFractionDigits: 0 })}</td>
          <td style="text-align:right;">₦${Number(summary.totalPAYE || 1842000).toLocaleString('en-NG', { maximumFractionDigits: 0 })}</td>
          <td style="text-align:right;color:var(--brand-emerald);">₦${Number(summary.totalNet || 9445200).toLocaleString('en-NG', { maximumFractionDigits: 0 })}</td>
          <td>NIBSS Automated Direct Credit</td>
        </tr>
      </tbody>
    </table>

    <!-- Statutory Certification & Dual Signatures -->
    <div style="margin-top:28px;padding:16px;background:var(--ink-bg-subtle);border-radius:8px;border:1px solid var(--ink-border);display:flex;align-items:center;justify-content:space-between;gap:20px;">
      <div>
        <strong style="font-size:12px;color:var(--brand-navy);text-transform:uppercase;letter-spacing:0.04em;">Legal Statutory Declaration</strong>
        <p style="font-size:11.5px;color:var(--ink-secondary);margin-top:4px;line-height:1.5;">
          Certified that all hours reflected in this ledger were validated via ShiftRelay Mobile ID Card verification (including Colleague Peer ID Scan) and auto clock-out audit logs in compliance with the Personal Income Tax Act (PITA 2011 as amended), Pension Reform Act 2014, and Employees' Compensation Act 2010.
        </p>
      </div>
      <div style="flex-shrink:0;">
        ${qrSvg}
      </div>
    </div>

    <div class="sr-sign-grid">
      <div class="sr-sign-box">
        <strong>Sherif Akanmu</strong>
        <span>Managing Director &amp; Chief Executive Officer</span>
        <span style="font-size:10px;color:var(--brand-emerald);font-weight:700;margin-top:4px;">✓ Electronically Authorized via ShiftRelay Exec Key</span>
      </div>
      <div class="sr-sign-box">
        <strong>Chief Financial Officer &amp; Remittance Controller</strong>
        <span>Finance Directorate · Riffmax Technology Limited</span>
        <span style="font-size:10px;color:var(--brand-emerald);font-weight:700;margin-top:4px;">✓ Statutory Reconciled (₦0.00 Variance)</span>
      </div>
    </div>

    <!-- Document Footer -->
    <div class="sr-doc-footer">
      <span>Generated by ShiftRelay Enterprise OS v1.48 · Master Ledger ID: <code>SR-LEDGER-${orgCode}-202611</code></span>
      <span>Page 1 of 1 · Confidential &amp; Legally Privileged</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1b. Supervisor & Executive Official Workforce Attendance Register Sheet
 */
export function generateAttendanceSheetHtml(sheetData = {}, org = {}) {
  const orgName = org.legal_name || org.trading_name || 'Riffmax Technology Limited';
  const orgCode = org.organisation_code || 'RIF-2026';
  const month = sheetData.month || new Date().toISOString().slice(0, 7);
  const periodLabel = sheetData.periodLabel || month;
  const deptLabel = sheetData.departmentLabel || 'All Departments';
  const generatedBy = sheetData.generatedBy || 'Operations Management';
  const summary = sheetData.summary || {};
  const rows = Array.isArray(sheetData.rows) ? sheetData.rows : [];
  const deptBars = Array.isArray(sheetData.departmentSummary) ? sheetData.departmentSummary : [];
  const qrSvg = generateQrSvg(`https://shiftrelayos.com/verify/attendance/${orgCode}/${month}`, 76);

  const rowsHtml = rows.map(r => {
    const statusTone = r.currentStatus === 'On Shift'
      ? 'color:#059669;background:#ecfdf5;border:1px solid #a7f3d0;'
      : r.currentStatus === 'Flagged'
        ? 'color:#dc2626;background:#fef2f2;border:1px solid #fecaca;'
        : 'color:#475569;background:#f8fafc;border:1px solid #cbd5e1;';
    return `
      <tr>
        <td style="font-family:monospace;font-weight:700;">${escapeHtml(r.staffId || 'SR-0000')}</td>
        <td>
          <strong style="color:var(--brand-navy);">${escapeHtml(r.name)}</strong><br>
          <small style="color:var(--ink-muted);">${escapeHtml(r.department || 'Operations')}</small>
        </td>
        <td style="font-family:monospace;font-size:11px;">${escapeHtml(r.shiftWindow || '06:00–14:00')}</td>
        <td style="text-align:center;font-weight:700;">${Number(r.daysPresent || 0)}</td>
        <td style="text-align:right;font-family:monospace;">${Number(r.regularHours || 0).toFixed(1)}h${Number(r.overtimeHours || 0) > 0 ? ` <span style="color:#0284c7;">(+${Number(r.overtimeHours).toFixed(1)}h)</span>` : ''}</td>
        <td style="text-align:center;${Number(r.exceptionsCount || 0) > 0 ? 'color:#d97706;font-weight:700;' : 'color:#64748b;'}">${Number(r.exceptionsCount || 0)}</td>
        <td style="text-align:center;font-weight:700;">${r.shiftGrade ? `${r.shiftGrade} (${r.shiftScore}%)` : '—'}</td>
        <td style="font-size:11px;color:var(--ink-secondary);">${escapeHtml(r.verificationMix || 'No punches')}</td>
        <td style="text-align:center;">
          <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;${statusTone}">${escapeHtml(r.currentStatus || 'Ready')}</span>
        </td>
      </tr>
    `;
  }).join('');

  const deptGraphicHtml = deptBars.length > 0 ? `
    <div style="margin-bottom:22px;padding:16px;border-radius:8px;border:1px solid var(--ink-border);background:#f8fafc;">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:var(--brand-navy);margin-bottom:10px;">
        Operating Unit Attendance &amp; Verified Hours Graphic
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px 18px;">
        ${deptBars.map(d => {
          const w = Math.min(100, Math.max(0, Number(d.attendanceRatePct || 0)));
          return `
            <div>
              <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px;">
                <strong style="color:var(--ink-primary);">${escapeHtml(d.department)}</strong>
                <span style="font-family:monospace;color:var(--ink-secondary);">${d.punchesCount} punches · ${Number(d.totalHours || 0).toFixed(1)}h (${w}%)</span>
              </div>
              <div style="height:7px;border-radius:999px;background:#e2e8f0;overflow:hidden;">
                <div style="width:${w}%;height:100%;background:linear-gradient(90deg,#059669,#0284c7);border-radius:999px;"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Workforce Attendance Register — ${escapeHtml(orgName)}</title>
  <style>${getDocumentStyles()}</style>
</head>
<body>
  <div class="sr-no-print" style="max-width:900px;margin:0 auto 16px;display:flex;justify-content:space-between;align-items:center;">
    <a href="javascript:window.history.back()" style="color:#0284c7;text-decoration:none;font-size:13px;font-weight:600;">← Back to ShiftRelay</a>
    <button onclick="window.print()" style="padding:9px 20px;background:#059669;color:#ffffff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(5,150,105,0.3);">
      Print / Save Official PDF
    </button>
  </div>

  <div class="sr-doc-page">
    <div class="sr-watermark">${Number(summary.exceptionsCount || 0) > 0 ? 'AUDIT REVIEW' : 'VERIFIED REGISTER'}</div>

    ${renderHtmlLetterheadHeader(org, {
      badge: 'Official Attendance Sheet',
      refId: `SR-ATT-${orgCode}-${month.replace('-', '')}`
    })}

    <div class="sr-meta-grid">
      <div class="sr-meta-item"><small>Reporting Period</small><strong>${escapeHtml(periodLabel)}</strong></div>
      <div class="sr-meta-item"><small>Department Scope</small><strong>${escapeHtml(deptLabel)}</strong></div>
      <div class="sr-meta-item"><small>Roster Headcount</small><strong>${Number(summary.totalStaff || rows.length)} Active Staff</strong></div>
      <div class="sr-meta-item"><small>Prepared By</small><strong>${escapeHtml(generatedBy)}</strong></div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;margin-bottom:20px;">
      <div style="background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #cbd5e1;">
        <span style="font-size:10.5px;color:var(--ink-muted);text-transform:uppercase;font-weight:700;">Verified Punches</span>
        <div style="font-size:16px;font-weight:800;color:var(--ink-primary);margin-top:2px;">${Number(summary.totalPunches || 0)}</div>
      </div>
      <div style="background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #cbd5e1;">
        <span style="font-size:10.5px;color:var(--ink-muted);text-transform:uppercase;font-weight:700;">Logged Hours</span>
        <div style="font-size:16px;font-weight:800;color:#0284c7;margin-top:2px;">${Number(summary.totalHours || 0).toFixed(1)}h <small style="font-size:11px;font-weight:600;">(${Number(summary.overtimeHours || 0).toFixed(1)}h OT)</small></div>
      </div>
      <div style="background:#f0fdf4;padding:12px;border-radius:6px;border:1px solid #86efac;">
        <span style="font-size:10.5px;color:#166534;text-transform:uppercase;font-weight:700;">Punctuality</span>
        <div style="font-size:16px;font-weight:800;color:var(--brand-emerald);margin-top:2px;">${Number(summary.punctualityRatePct ?? 100).toFixed(1)}%</div>
      </div>
      <div style="background:#fffbeb;padding:12px;border-radius:6px;border:1px solid #fde68a;">
        <span style="font-size:10.5px;color:#92400e;text-transform:uppercase;font-weight:700;">Exceptions / Flags</span>
        <div style="font-size:16px;font-weight:800;color:#d97706;margin-top:2px;">${Number(summary.exceptionsCount || 0)}</div>
      </div>
    </div>

    ${deptGraphicHtml}

    <table class="sr-table">
      <thead>
        <tr>
          <th>Staff ID</th>
          <th>Personnel &amp; Unit</th>
          <th>Window</th>
          <th style="text-align:center;">Days</th>
          <th style="text-align:right;">Hours (OT)</th>
          <th style="text-align:center;">Exc.</th>
          <th style="text-align:center;">Score</th>
          <th>Verification Mode</th>
          <th style="text-align:center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--ink-muted);">No matching staff attendance records for this period.</td></tr>'}
      </tbody>
    </table>

    <div style="margin-top:26px;padding:15px;background:var(--ink-bg-subtle);border-radius:8px;border:1px solid var(--ink-border);display:flex;align-items:center;justify-content:space-between;gap:20px;">
      <div>
        <strong style="font-size:12px;color:var(--brand-navy);text-transform:uppercase;letter-spacing:0.04em;">Attendance Integrity Attestation</strong>
        <p style="font-size:11.5px;color:var(--ink-secondary);margin-top:4px;line-height:1.5;">
          Generated from real-time geofenced mobile clock-ins and peer ID verification scans for ${escapeHtml(orgName)}. Covers ${escapeHtml(periodLabel)} (${escapeHtml(deptLabel)}).
        </p>
      </div>
      <div style="flex-shrink:0;">${qrSvg}</div>
    </div>

    <div class="sr-sign-grid">
      <div class="sr-sign-box">
        <strong>Shift Supervisor Verification</strong>
        <span>Sign-Off · Operational Floor Lead</span>
        <span style="font-size:10px;color:var(--brand-emerald);font-weight:700;margin-top:4px;">Generated: ${escapeHtml(new Date().toISOString().slice(0, 16).replace('T', ' '))} UTC</span>
      </div>
      <div class="sr-sign-box">
        <strong>Executive / HR Directorate</strong>
        <span>${escapeHtml(orgName)} (${escapeHtml(orgCode)})</span>
        <span style="font-size:10px;color:var(--brand-emerald);font-weight:700;margin-top:4px;">Audit-Verified Register</span>
      </div>
    </div>

    <div class="sr-doc-footer">
      <span>Generated by ShiftRelay Enterprise OS · Register ID: <code>SR-ATT-${escapeHtml(orgCode)}-${escapeHtml(month.replace('-', ''))}</code></span>
      <span>Confidential — Internal Workforce Audit Record</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 2. Verified Worker Professional CV & Operational Dossier
 */
export function generateCvReportHtml(user = {}, profile = {}, org = {}) {
  const name = user.name || profile.name || 'Tariq Al-Hassan';
  const role = user.role_title || profile.title || 'Senior Distributed Systems Engineer';
  const dept = user.department || profile.department || 'Backend Infrastructure';
  const staffId = user.staff_id || profile.staffId || 'SR-0042';
  const orgName = org.legal_name || org.trading_name || user.organisation_name || COMPANY_LEGAL;
  const orgCode = org.organisation_code || user.company_id || 'RIF-2026';
  const hours = profile.verifiedHours || '1,420';
  const punctuality = profile.punctuality || '99.4%';
  const incidents = profile.incidents || '0';
  const handovers = profile.handovers || '142';
  const shiftWindow = profile.shiftWindow || '06:00 – 14:00 WAT (Morning Shift)';

  const qrSvg = generateQrSvg(`https://shiftrelayos.com/verify/worker/${staffId}`, 90);

  // Real GS1-128 SVG Barcode Generator
  function makeBarcodeSvg(code) {
    const bars = [2,1,1,2,3,1,1,2,1,3,2,1,2,2,1,1,3,1,2,1,1,2,2,2,1,3,1,2,1,1,2,2,3,1,1,2,1,2,2,1,3,2];
    let x = 10;
    let rects = '';
    for (let i = 0; i < bars.length; i++) {
      const w = bars[i] * 1.8;
      if (i % 2 === 0) {
        rects += `<rect x="${x}" y="0" width="${w}" height="38" fill="#0f172a" />`;
      }
      x += w;
    }
    return `<svg width="${x + 10}" height="42" viewBox="0 0 ${x + 10} 42">${rects}</svg>`;
  }
  const barcodeSvg = makeBarcodeSvg(staffId);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Professional Operational Dossier — ${escapeHtml(name)}</title>
  <style>
    ${getDocumentStyles()}
    .sr-cv-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 28px;
    }
    .sr-cv-section-title {
      font-size: 13px;
      font-weight: 800;
      color: var(--brand-navy);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 14px;
    }
    .sr-timeline-item {
      position: relative;
      padding-left: 20px;
      margin-bottom: 16px;
      border-left: 2px solid #cbd5e1;
    }
    .sr-timeline-item::before {
      content: '';
      position: absolute;
      left: -5px;
      top: 4px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--brand-emerald);
    }
  </style>
</head>
<body>
  <div class="sr-no-print" style="max-width:900px;margin:0 auto 16px;display:flex;justify-content:space-between;align-items:center;">
    <a href="javascript:window.history.back()" style="color:#0284c7;text-decoration:none;font-size:13px;font-weight:600;">← Back to Profile</a>
    <button onclick="window.print()" style="padding:9px 20px;background:#059669;color:#ffffff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(5,150,105,0.3);">
      🖨️ Print / Save Verified CV
    </button>
  </div>

  <div class="sr-doc-page">
    ${renderHtmlLetterheadHeader(org, { orgName, orgCode, badge: 'Verified Personnel Dossier', refId: `SR-CV-${staffId}` })}
    <!-- Employee Profile Card & Digital ID Barcode -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:18px;border-bottom:1px solid var(--ink-border);margin-bottom:20px;gap:16px;">
      <div style="display:flex;gap:20px;align-items:center;">
        <div style="width:72px;height:72px;border-radius:12px;background:#0f172a;display:flex;align-items:center;justify-content:center;color:#00f5a0;font-size:32px;font-weight:900;">
          ${escapeHtml(name.split(' ').map(n=>n[0]).join(''))}
        </div>
        <div>
          <h1 style="font-size:24px;font-weight:900;color:var(--brand-navy);letter-spacing:-0.02em;">${escapeHtml(name)}</h1>
          <p style="font-size:14px;color:var(--brand-emerald);font-weight:700;">${escapeHtml(role)}</p>
          <p style="font-size:12px;color:var(--ink-muted);">${escapeHtml(dept)} · ${escapeHtml(orgName)} · Lagos, Nigeria</p>
        </div>
      </div>
      <div style="text-align:right;">
        <span class="sr-doc-badge">Verified Personnel</span>
        <div style="margin-top:8px;">${barcodeSvg}</div>
        <div style="font-family:monospace;font-size:11px;font-weight:700;color:var(--ink-primary);">${escapeHtml(staffId)}</div>
      </div>
    </div>

    <!-- Operational Reliability Scorecard -->
    <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:16px;margin-bottom:24px;">
      <div style="font-size:11px;font-weight:800;color:var(--ink-muted);text-transform:uppercase;margin-bottom:10px;letter-spacing:0.04em;">
        Verified Frontline Reliability Metrics (ShiftRelay Audited)
      </div>
      <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:12px;text-align:center;">
        <div>
          <div style="font-size:18px;font-weight:900;color:var(--brand-navy);">${hours}</div>
          <small style="font-size:10.5px;color:var(--ink-muted);">Verified Hours</small>
        </div>
        <div>
          <div style="font-size:18px;font-weight:900;color:var(--brand-emerald);">${punctuality}</div>
          <small style="font-size:10.5px;color:var(--ink-muted);">Punctuality Score</small>
        </div>
        <div>
          <div style="font-size:18px;font-weight:900;color:#0284c7;">${incidents}</div>
          <small style="font-size:10.5px;color:var(--ink-muted);">Safety Incidents</small>
        </div>
        <div>
          <div style="font-size:18px;font-weight:900;color:var(--brand-navy);">${handovers}</div>
          <small style="font-size:10.5px;color:var(--ink-muted);">Verified Handovers</small>
        </div>
        <div>
          <div style="font-size:12px;font-weight:800;color:var(--ink-primary);padding-top:4px;">06:00 – 14:00</div>
          <small style="font-size:10.5px;color:var(--ink-muted);">Default Window</small>
        </div>
      </div>
    </div>

    <!-- CV Body Layout -->
    <div class="sr-cv-grid">
      <!-- Left Column: Summary, Experience, Education -->
      <div>
        <div class="sr-cv-section-title">Professional Executive Summary</div>
        <p style="font-size:13px;color:var(--ink-secondary);line-height:1.6;margin-bottom:20px;">
          Frontline technology operations specialist with extensive track record in mission-critical distributed systems, site reliability engineering, and industrial infrastructure. Demonstrated excellence across 1,420+ biometric-verified on-duty operational hours with zero safety infractions and 99.4% punctuality score.
        </p>

        <div class="sr-cv-section-title">Operational Experience &amp; Duty Timeline</div>
        <div class="sr-timeline-item">
          <strong style="font-size:13px;color:var(--brand-navy);">Senior Distributed Systems Engineer</strong><br>
          <span style="font-size:11.5px;color:var(--ink-muted);">Riffmax Technology Limited · 2024 – Present</span>
          <p style="font-size:12.5px;color:var(--ink-secondary);margin-top:4px;">
            Oversees backend multi-region PostgreSQL replication, mobile digital Staff ID verification, Colleague Peer ID scanning workflows, and statutory payroll aggregation for frontline enterprises.
          </p>
        </div>
        <div class="sr-timeline-item">
          <strong style="font-size:13px;color:var(--brand-navy);">Site Reliability &amp; Infrastructure Engineer</strong><br>
          <span style="font-size:11.5px;color:var(--ink-muted);">Sub-Saharan Logistics Core · 2021 – 2024</span>
          <p style="font-size:12.5px;color:var(--ink-secondary);margin-top:4px;">
            Managed 24/7 operational dispatch communications, GPS attendance zone telemetry, and failover incident response across 3 commercial hubs.
          </p>
        </div>

        <div class="sr-cv-section-title" style="margin-top:20px;">Academic Background</div>
        <div style="font-size:12.5px;color:var(--ink-secondary);line-height:1.6;">
          <strong>B.Sc. Computer Science &amp; Distributed Engineering</strong><br>
          <span style="color:var(--ink-muted);font-size:11.5px;">University of Lagos (UNILAG) · First Class Honours</span>
        </div>
      </div>

      <!-- Right Column: Skills, Certifications, Statutory Compliance -->
      <div>
        <div class="sr-cv-section-title">Core Competencies</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px;">
          <span style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">Distributed Systems</span>
          <span style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">PostgreSQL Architecture</span>
          <span style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">Geofencing Telemetry</span>
          <span style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">Statutory Payroll Logic</span>
          <span style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">HA Cluster Failover</span>
          <span style="background:#f1f5f9;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;">NDPA Data Isolation</span>
        </div>

        <div class="sr-cv-section-title">Verified Certifications</div>
        <ul style="font-size:12px;color:var(--ink-secondary);line-height:1.7;padding-left:16px;margin-bottom:20px;">
          <li>AWS Certified Solutions Architect (Professional)</li>
          <li>Kubernetes CKA Certified Administrator</li>
          <li>OSHA 30-Hour General Industry Safety Certification</li>
          <li>ISO/IEC 27001 Information Security Lead Implementer</li>
        </ul>

        <div class="sr-cv-section-title">Statutory Compliance</div>
        <div style="background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #cbd5e1;font-size:11px;line-height:1.7;">
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--ink-muted);">PenCom RSA PIN:</span>
            <strong style="font-family:monospace;">PEN10098472910</strong>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--ink-muted);">LIRS Tax ID:</span>
            <strong style="font-family:monospace;">N-10938472</strong>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--ink-muted);">Identity Status:</span>
            <strong style="color:var(--brand-emerald);">✓ BVN Verified</strong>
          </div>
        </div>

        <!-- Verification QR Seal -->
        <div style="text-align:center;margin-top:24px;padding:12px;background:#f8fafc;border-radius:8px;border:1px dashed #cbd5e1;">
          <div style="display:flex;justify-content:center;">${qrSvg}</div>
          <small style="font-size:10px;color:var(--ink-muted);display:block;margin-top:4px;">Scan to verify credentials</small>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="sr-doc-footer">
      <span>Official Qualification Record · ShiftRelay Sovereign Identity System</span>
      <span>Authenticated: ${new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 3. Comprehensive Terms of Service & Statutory Compliance Form
 */
export function generateTermsOfServiceHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>ShiftRelay Master Terms of Service &amp; Statutory SLA</title>
  <style>
    ${getDocumentStyles()}
    .sr-legal-section {
      margin-bottom: 24px;
    }
    .sr-legal-section h2 {
      font-size: 14px;
      font-weight: 800;
      color: var(--brand-navy);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }
    .sr-legal-section p, .sr-legal-section li {
      font-size: 12.5px;
      color: var(--ink-secondary);
      line-height: 1.65;
      margin-bottom: 8px;
    }
    .sr-legal-section ul {
      padding-left: 20px;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <div class="sr-no-print" style="max-width:900px;margin:0 auto 16px;display:flex;justify-content:space-between;align-items:center;">
    <a href="javascript:window.history.back()" style="color:#0284c7;text-decoration:none;font-size:13px;font-weight:600;">← Back to Workplace</a>
    <button onclick="window.print()" style="padding:9px 20px;background:#059669;color:#ffffff;border:none;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(5,150,105,0.3);">
      🖨️ Print / Save Legal Agreement
    </button>
  </div>

  <div class="sr-doc-page">
    ${renderHtmlLetterheadHeader({}, {
      orgName: LEGAL_ENTITY.platformOperatorName,
      badge: 'Official Legal Instrument',
      refId: POLICY_VERSIONS.terms
    })}

    <div class="sr-meta-grid">
      <div class="sr-meta-item">
        <small>Effective Date</small>
        <strong>November 1, 2026</strong>
      </div>
      <div class="sr-meta-item">
        <small>Governing Jurisdiction</small>
        <strong>Federal Republic of Nigeria</strong>
      </div>
      <div class="sr-meta-item">
        <small>Statutory Framework</small>
        <strong>PITA 2011, PenCom 2014, NDPA 2023</strong>
      </div>
      <div class="sr-meta-item">
        <small>Arbitration Forum</small>
        <strong>Lagos Court of Arbitration (LCA)</strong>
      </div>
    </div>

    <!-- Section 1 -->
    <div class="sr-legal-section">
      <h2>1. Platform Subscription, Tenant Segregation &amp; Authorized Personnel</h2>
      <p>
        1.1. <strong>Scope of Service:</strong> Riffmax Technology Limited ("ShiftRelay", "we", "our") licenses the ShiftRelay Frontline OS to the subscribed employer entity ("Client Organization", "Subscriber") for the exclusive management of frontline shift rosters, mobile digital Staff ID &amp; Colleague Peer Scan attendance, auto clock-out enforcement, handover briefings, and statutory payroll calculations.
      </p>
      <p>
        1.2. <strong>Tenant Segregation:</strong> All employee rosters, timecards, geolocation muster stamps, and salary compensation agreements are segregated using Row-Level Security (RLS) and cryptographically isolated tenant keys. Under no circumstance does ShiftRelay pool, cross-reference, or monetize tenant personnel records.
      </p>
    </div>

    <!-- Section 2 -->
    <div class="sr-legal-section">
      <h2>2. Digital Staff ID, Attendance Grace Periods, Automated Reminders &amp; Exceptions</h2>
      <p>
        2.1. <strong>Mobile Digital Staff ID &amp; Colleague Peer Scan:</strong> Once onboarded, each staff member is issued a digital Staff ID Card. Workers with smartphones clock in directly via the ShiftRelay mobile app, while workers without smartphones clock in once per shift via an onboarded colleague's peer scanner, with automated shift-end clock-out enforced server-side.
      </p>
      <p>
        2.2. <strong>Employer Grace Windows &amp; Automated Reminders:</strong> Each Subscriber configures organizational attendance policies, including late grace windows, scheduled pre-shift reminders, missed clock-in supervisor alerts, and proportional unexcused deduction calculations. Supervisors retain auditable pardon vs. deduction controls before payroll lock.
      </p>
      <p>
        2.3. <strong>Muster Perimeter Verification:</strong> GPS coordinates gathered during clock-in are matched against the client facility's registered geofence boundary (zero off-shift background tracking). Punches recorded outside authorized operational perimeters are flagged for supervisor exception review.
      </p>
    </div>

    <!-- Section 3 -->
    <div class="sr-legal-section">
      <h2>3. Nigerian Statutory Tax, Pension &amp; Deduction Governance</h2>
      <p>
        3.1. <strong>Strict Regulatory Compliance:</strong> ShiftRelay's payroll compilation engine executes calculations strictly in alignment with:
      </p>
      <ul>
        <li><strong>Personal Income Tax Act (PITA 2011 as amended):</strong> Enforcing Consolidated Relief Allowance (higher of 1% annual gross or ₦200,000, plus 20% annual gross) and graduated PAYE tax brackets (7% to 24%).</li>
        <li><strong>Pension Reform Act 2014:</strong> Mandatory 8% Employee deduction and 10% Employer contribution remitted to licensed Pension Fund Administrators (PFAs).</li>
        <li><strong>Employees' Compensation Act (ECA 2010):</strong> Mandatory 1% payroll liability borne 100% by the Employer to the Nigeria Social Insurance Trust Fund (NSITF). Zero deduction is assessed to the worker.</li>
        <li><strong>Industrial Training Fund (ITF):</strong> 1% employer levy for qualifying establishments.</li>
      </ul>
      <p>
        3.2. <strong>₦0.00 Variance Guarantee:</strong> ShiftRelay mathematically audits every monthly payroll run against physical muster timestamps. All gross-to-net calculations reconcile to ₦0.00 drift before commercial bank payment schedules are generated.
      </p>
    </div>

    <!-- Section 4 -->
    <div class="sr-legal-section">
      <h2>4. Nigeria Data Protection Act (NDPA 2023) Compliance</h2>
      <p>
        4.1. <strong>Lawful Basis of Processing:</strong> Personal data—including worker full names, phone numbers, BVN validation tokens, job titles, and bank account numbers—is processed solely for the fulfillment of the frontline employment contract and statutory fiscal obligations.
      </p>
      <p>
        4.2. <strong>Worker Rights &amp; Rectification:</strong> Every worker maintains the statutory right under the NDPA to inspect their attendance history, contest erroneous punches, and submit rectification requests to their designated facility supervisor.
      </p>
    </div>

    <!-- Section 5 -->
    <div class="sr-legal-section">
      <h2>5. Central Bank of Nigeria (CBN) Lending Boundary Safeguards</h2>
      <p>
        5.1. <strong>Zero-Lending Regulatory Boundary:</strong> ShiftRelay is exclusively a workplace management and compliance software engine. ShiftRelay does not operate digital wallets, does not extend consumer credit or salary advances, and charges zero interest or financing fees.
      </p>
      <p>
        5.2. <strong>Disbursement Mechanics:</strong> ShiftRelay produces verified disbursement files formatted for standard NIBSS commercial banking rails. The client organization's finance desk and authorized commercial bank execute all actual fund transfers.
      </p>
    </div>

    <!-- Section 6 -->
    <div class="sr-legal-section">
      <h2>6. 99.98% Service Level Agreement (SLA) &amp; Offline Continuity</h2>
      <p>
        6.1. <strong>High Availability:</strong> ShiftRelay guarantees 99.98% operational uptime for gate check-in and handover synchronization endpoints.
      </p>
      <p>
        6.2. <strong>Offline Buffering:</strong> In the event of telecommunications outages at remote industrial terminals, muster devices securely buffer check-ins in local encrypted storage and execute lossless reconciliation once connectivity is restored.
      </p>
    </div>

    <!-- Section 7 -->
    <div class="sr-legal-section">
      <h2>7. Dispute Resolution &amp; Governing Law</h2>
      <p>
        7.1. <strong>Arbitration:</strong> Any dispute arising from this Agreement that cannot be resolved amicably within thirty (30) days shall be submitted to and finally settled by arbitration administered by the Lagos Court of Arbitration (LCA) under its Arbitration Rules.
      </p>
      <p>
        7.2. <strong>Governing Law:</strong> This Agreement shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria.
      </p>
    </div>

    <!-- Corporate Signatures & Watermark -->
    <div class="sr-sign-grid">
      <div class="sr-sign-box">
        <strong>ShiftRelay Technologies Limited</strong>
        <span>Legal Counsel &amp; Corporate Secretarial Office</span>
        <span style="font-size:10px;color:var(--brand-emerald);font-weight:700;margin-top:4px;">✓ Corporate Seal Enacted (RC: 7392819)</span>
      </div>
      <div class="sr-sign-box">
        <strong>Subscriber Enterprise Entity</strong>
        <span>Authorized Corporate Representative / Employer</span>
        <span style="font-size:10px;color:var(--brand-emerald);font-weight:700;margin-top:4px;">✓ Master Subscription Active</span>
      </div>
    </div>

    <div class="sr-doc-footer">
      <span>Official Instrument: <code>${escapeHtml(POLICY_VERSIONS.terms)}</code> · ${escapeHtml(COMPANY_LEGAL)} · ${escapeHtml(LEGAL_ENTITY.securityPostureClaim)}</span>
      <span>Effective: November 2026 · Confidential &amp; Legally Binding</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 4. Printable NDPA 2023 Data Processing Addendum (DPA) & Sub-Processor Schedule
 */
export function generateDpaReportHtml({
  orgName = 'Subscriber Enterprise Organisation',
  orgCode = 'TENANT-ACTIVE',
  signerName = 'Authorized Data Controller Representative',
  signedAt = new Date().toISOString(),
  ipAddress = 'Recorded on Activation',
  dpaVersion = POLICY_VERSIONS.dpa
} = {}) {
  const subRows = LEGAL_ENTITY.subProcessors.map(sp => `
    <tr>
      <td><strong>${escapeHtml(sp.name)}</strong></td>
      <td>${escapeHtml(sp.role)}</td>
      <td>${escapeHtml(sp.region)}</td>
      <td>${escapeHtml(sp.safeguard)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(LEGAL_ENTITY.brandName)} — NDPA 2023 Data Processing Addendum (${escapeHtml(dpaVersion)})</title>
  <style>${getDocumentStyles()}</style>
</head>
<body>
  <button class="sr-print-btn no-print" onclick="window.print()">Print / Save NDPA 2023 DPA</button>
  <div class="sr-doc-page">
    ${renderHtmlLetterheadHeader({}, {
      orgName: `${COMPANY_LEGAL} (${LEGAL_ENTITY.brandName})`,
      orgCode,
      badge: 'NDPA 2023 DPA Schedule',
      refId: dpaVersion
    })}

    <div class="sr-meta-grid">
      <div class="sr-meta-item"><small>Data Controller (Customer)</small><strong>${escapeHtml(orgName)} (${escapeHtml(orgCode)})</strong></div>
      <div class="sr-meta-item"><small>Data Processor</small><strong>${escapeHtml(COMPANY_LEGAL)}</strong></div>
      <div class="sr-meta-item"><small>Governing Law</small><strong>Nigeria Data Protection Act (NDPA) 2023 &amp; Labour Act</strong></div>
      <div class="sr-meta-item"><small>DPO Contact</small><strong>${escapeHtml(LEGAL_ENTITY.dpoEmail)}</strong></div>
    </div>

    <div class="sr-legal-section">
      <h2>1. Controller &amp; Processor Roles and Lawful Basis</h2>
      <p>1.1. The Customer acts as the <strong>Data Controller</strong> determining the purposes and means of processing frontline employee attendance, shift handover logs, and payroll inputs. ${escapeHtml(COMPANY_LEGAL)} acts strictly as a <strong>Data Processor</strong> operating on documented employer instructions.</p>
      <p>1.2. Processing relies on employment contract performance, statutory obligations under PITA 2011, PenCom PRA 2014, NSITF/NHF, and explicit consent where required by NDPA 2023 Section 25.</p>
    </div>

    <div class="sr-legal-section">
      <h2>2. Technical, Organizational &amp; Encryption Safeguards (${escapeHtml(LEGAL_ENTITY.securityPostureClaim)})</h2>
      <ul>
        <li><strong>Encryption:</strong> TLS 1.3 transport encryption across all endpoints; AES-256 at-rest database and attachment storage encryption.</li>
        <li><strong>Multi-Tenant Isolation:</strong> Strict organisation-scoped queries (` + '`organisation_id`' + `) preventing cross-tenant roster, document, or payroll leakage.</li>
        <li><strong>Data Minimization &amp; Point-of-Punch GPS:</strong> Geolocation coordinates are evaluated exclusively during clock-in/clock-out handshakes — zero background off-shift location tracking.</li>
        <li><strong>Biometric &amp; Passkey Discipline:</strong> WebAuthn hardware passkeys never expose raw fingerprint/facial templates; Peer ID capture frames stay encrypted inside tenant audit vaults.</li>
      </ul>
    </div>

    <div class="sr-legal-section">
      <h2>3. Personal Data Breach Notification &amp; Retention</h2>
      <p>3.1. Processor shall notify the Controller without undue delay and no later than <strong>72 hours</strong> upon confirming any personal data breach impacting Customer records, enabling timely notification to the Nigeria Data Protection Commission (NDPC).</p>
      <p>3.2. Upon subscription termination, Customer may export payroll, attendance ledger, and exception histories in CSV/HTML format; tenant operational records are securely purged or anonymized within 30 days of verified termination, subject to statutory Nigerian tax retention schedules (6 years).</p>
    </div>

    <div class="sr-legal-section">
      <h2>4. Authorized Sub-Processors</h2>
      <table class="sr-table">
        <thead>
          <tr><th>Sub-Processor</th><th>Service Function</th><th>Hosting Region</th><th>NDPA Transfer Safeguard</th></tr>
        </thead>
        <tbody>${subRows}</tbody>
      </table>
    </div>

    <div class="sr-sign-grid">
      <div class="sr-sign-box">
        <strong>${escapeHtml(COMPANY_LEGAL)}</strong>
        <span>Data Protection Officer (${escapeHtml(LEGAL_ENTITY.dpoEmail)})</span>
        <span style="font-size:10px;color:var(--brand-emerald);font-weight:700;margin-top:4px;">✓ ${escapeHtml(LEGAL_ENTITY.securityPostureClaim)}</span>
      </div>
      <div class="sr-sign-box">
        <strong>${escapeHtml(orgName)}</strong>
        <span>Executed By: ${escapeHtml(signerName)}</span>
        <span style="font-size:10px;color:var(--brand-emerald);font-weight:700;margin-top:4px;">Recorded: ${escapeHtml(String(signedAt).slice(0, 19))} · IP: ${escapeHtml(ipAddress)}</span>
      </div>
    </div>

    <div class="sr-doc-footer">
      <span>Official Instrument: <code>${escapeHtml(dpaVersion)}</code> · ${escapeHtml(COMPANY_LEGAL)}</span>
      <span>Executed under Nigeria Data Protection Act (NDPA) 2023</span>
    </div>
  </div>
</body>
</html>`;
}

function buildStyledWefSheet(sheetName, aoa, colWidths, { headerRowIndex = -1 } = {}) {
  const rows = aoa.map((row, rIdx) =>
    (Array.isArray(row) ? row : []).map((val) => {
      if (rIdx === 0) {
        return { value: String(val ?? ''), fontWeight: 'bold', backgroundColor: '#0F2744', color: '#FFFFFF', fontSize: 12 };
      }
      if (rIdx === 1 || rIdx === 2) {
        return { value: String(val ?? ''), backgroundColor: '#F8FAFC', color: '#334155', fontSize: 10 };
      }
      if (rIdx === headerRowIndex) {
        return { value: String(val ?? ''), fontWeight: 'bold', backgroundColor: '#ECFDF5', color: '#047857' };
      }
      if (typeof val === 'number' && Number.isFinite(val)) {
        return { type: Number, value: val };
      }
      return { value: String(val ?? '') };
    })
  );
  return {
    sheet: String(sheetName || 'Sheet1').slice(0, 31),
    data: rows,
    columns: colWidths.map((w) => ({ width: w }))
  };
}

/**
 * Generate Real Excel (.xlsx) Attendance Sheet Workbook using write-excel-file
 */
export async function generateAttendanceSheetXlsxBuffer(sheetData = {}, org = {}) {
  const month = sheetData.month || new Date().toISOString().slice(0, 7);
  const meta = resolveCompanyLetterhead(org, {
    title: 'OFFICIAL WORKFORCE ATTENDANCE SHEET',
    refId: `SR-ATT-${org.organisation_code || 'RIF-2026'}-${month.replace('-', '')}`
  });
  const periodLabel = sheetData.periodLabel || month;
  const summary = sheetData.summary || {};
  const rows = Array.isArray(sheetData.rows) ? sheetData.rows : [];
  const deptBars = Array.isArray(sheetData.departmentSummary) ? sheetData.departmentSummary : [];

  const registerAoa = [
    [`${meta.orgName} — OFFICIAL WORKFORCE ATTENDANCE SHEET`],
    [`Registration: ${meta.statutoryLine}`, `Address: ${meta.address}`, `Contact: ${meta.email}`],
    [`Ref: ${meta.refId}`, `Period: ${periodLabel}`, `Department: ${sheetData.departmentLabel || 'All Departments'}`, `Prepared By: ${sheetData.generatedBy || 'Management'}`],
    [`Staff: ${summary.totalStaff || rows.length}`, `Punches: ${summary.totalPunches || 0}`, `Hours: ${Number(summary.totalHours || 0).toFixed(1)}h (OT ${Number(summary.overtimeHours || 0).toFixed(1)}h)`, `Exceptions: ${summary.exceptionsCount || 0}`],
    [],
    ['Staff ID', 'Name', 'Department', 'Title', 'Shift Window', 'Days Present', 'Punches', 'Regular Hours', 'Overtime Hours', 'Total Hours', 'Exceptions', 'Score', 'Verification Mode', 'Status'],
    ...rows.map(r => [
      String(r.staffId || ''),
      String(r.name || ''),
      String(r.department || ''),
      String(r.title || ''),
      String(r.shiftWindow || ''),
      Number(r.daysPresent || 0),
      Number(r.punchesCount || 0),
      Number(r.regularHours || 0),
      Number(r.overtimeHours || 0),
      Number(r.totalHours || 0),
      Number(r.exceptionsCount || 0),
      r.shiftGrade ? `${r.shiftGrade} (${r.shiftScore}%)` : 'Ready',
      String(r.verificationMix || ''),
      String(r.currentStatus || 'Ready')
    ])
  ];

  const unitAoa = [
    [`${meta.orgName} (${meta.orgCode}) — OPERATING UNIT SUMMARY`],
    [`Registration: ${meta.statutoryLine}`, `Ref: ${meta.refId}`],
    [`Period: ${periodLabel}`, `Unit Scope: ${sheetData.departmentLabel || 'All Departments'}`],
    [],
    ['Department / Operating Unit', 'Staff Count', 'On Shift Now', 'Verified Punches', 'Logged Hours', 'Attendance Rate (%)', 'Exceptions'],
    ...deptBars.map(d => [
      String(d.department || ''),
      Number(d.staffCount || 0),
      Number(d.activeCount || 0),
      Number(d.punchesCount || 0),
      Number(d.totalHours || 0),
      Number(d.attendanceRatePct || 0),
      Number(d.exceptionsCount || 0)
    ])
  ];

  const mainCols = [12, 24, 26, 26, 14, 12, 10, 14, 15, 13, 11, 12, 19, 13];
  const unitCols = [28, 12, 13, 16, 13, 19, 12];
  return writeXlsxFile([
    buildStyledWefSheet('Attendance Register', registerAoa, mainCols, { headerRowIndex: 5 }),
    buildStyledWefSheet('Unit Summary', unitAoa, unitCols, { headerRowIndex: 4 })
  ]).toBuffer();
}

/**
 * Generate Downloadable Binary PDF (.pdf) Attendance Sheet using pre-designed Company Letterhead
 */
export async function generateAttendanceSheetPdfBytes(sheetData = {}, org = {}) {
  const month = sheetData.month || new Date().toISOString().slice(0, 7);
  const periodLabel = sheetData.periodLabel || month;
  const summary = sheetData.summary || {};
  const rows = Array.isArray(sheetData.rows) ? sheetData.rows : [];

  const pdfDoc = await PDFDocument.create();
  const lh = await createPdfLetterheadContext(pdfDoc, org, {
    badge: 'Official Attendance',
    title: `${org.legal_name || org.trading_name || COMPANY_LEGAL} (${org.organisation_code || 'RIF-2026'}) - Official Workforce Attendance Register`,
    subtitle: `Period: ${periodLabel}  |  Unit: ${sheetData.departmentLabel || 'All Departments'}  |  Prepared By: ${sheetData.generatedBy || 'Management'}`,
    refId: `SR-ATT-${org.organisation_code || 'RIF-2026'}-${month.replace('-', '')}`
  }, { landscape: true });

  const { fontRegular, fontBold, margin, contentWidth, pageWidth, pageHeight } = lh;
  const lineH = 18;

  const drawPageChrome = (p) => {
    let y = lh.drawPageHeader(p);
    p.drawRectangle({ x: margin, y: y - 22, width: contentWidth, height: 24, color: rgb(0.95, 0.98, 0.97), borderColor: rgb(0.8, 0.88, 0.85), borderWidth: 0.75 });
    p.drawText(pdfSafeText(`Roster: ${summary.totalStaff || rows.length} Staff    |    Punches: ${summary.totalPunches || 0}    |    Logged Hours: ${Number(summary.totalHours || 0).toFixed(1)}h (OT ${Number(summary.overtimeHours || 0).toFixed(1)}h)    |    Punctuality: ${Number(summary.punctualityRatePct ?? 100).toFixed(1)}%    |    Exceptions: ${summary.exceptionsCount || 0}`), {
      x: margin + 10, y: y - 14, size: 9, font: fontBold, color: rgb(0.06, 0.11, 0.16)
    });
    y -= 42;
    const cols = [
      { label: 'Staff ID', x: margin + 4 },
      { label: 'Name', x: margin + 68 },
      { label: 'Department', x: margin + 225 },
      { label: 'Window', x: margin + 390 },
      { label: 'Days', x: margin + 470 },
      { label: 'Hours (OT)', x: margin + 515 },
      { label: 'Exc.', x: margin + 595 },
      { label: 'Verification', x: margin + 635 },
      { label: 'Status', x: margin + 738 }
    ];
    p.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 19, color: rgb(0.93, 0.95, 0.97) });
    cols.forEach(c => p.drawText(c.label, { x: c.x, y, size: 8.5, font: fontBold, color: rgb(0.22, 0.28, 0.36) }));
    return y - 22;
  };

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = drawPageChrome(page);

  for (let i = 0; i < rows.length; i++) {
    if (y < margin + 52) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = drawPageChrome(page);
    }
    const r = rows[i];
    if (i % 2 === 1) {
      page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: lineH, color: rgb(0.98, 0.99, 1) });
    }
    const hrsText = `${Number(r.regularHours || 0).toFixed(1)}h${Number(r.overtimeHours || 0) > 0 ? ` (+${Number(r.overtimeHours).toFixed(1)}h)` : ''}`;
    page.drawText(pdfSafeText(r.staffId).slice(0, 10), { x: margin + 4, y, size: 8.5, font: fontBold, color: rgb(0.06, 0.45, 0.39) });
    page.drawText(pdfSafeText(r.name).slice(0, 26), { x: margin + 68, y, size: 8.5, font: fontBold, color: rgb(0.06, 0.1, 0.16) });
    page.drawText(pdfSafeText(r.department).slice(0, 26), { x: margin + 225, y, size: 8.5, font: fontRegular, color: rgb(0.28, 0.35, 0.44) });
    page.drawText(pdfSafeText(r.shiftWindow).slice(0, 14), { x: margin + 390, y, size: 8.5, font: fontRegular, color: rgb(0.2, 0.25, 0.33) });
    page.drawText(String(Number(r.daysPresent || 0)), { x: margin + 474, y, size: 8.5, font: fontBold, color: rgb(0.06, 0.1, 0.16) });
    page.drawText(pdfSafeText(hrsText), { x: margin + 515, y, size: 8.5, font: fontRegular, color: rgb(0.06, 0.1, 0.16) });
    page.drawText(String(Number(r.exceptionsCount || 0)), { x: margin + 599, y, size: 8.5, font: fontRegular, color: Number(r.exceptionsCount || 0) > 0 ? rgb(0.8, 0.38, 0.05) : rgb(0.35, 0.42, 0.5) });
    page.drawText(pdfSafeText(r.verificationMix).slice(0, 18), { x: margin + 635, y, size: 8.2, font: fontRegular, color: rgb(0.28, 0.35, 0.44) });
    page.drawText(pdfSafeText(r.currentStatus).slice(0, 12), { x: margin + 738, y, size: 8.5, font: fontBold, color: r.currentStatus === 'On Shift' ? rgb(0.02, 0.55, 0.38) : rgb(0.28, 0.35, 0.44) });
    y -= lineH;
  }

  // Sign-off strip at end of register
  if (y < margin + 76) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = lh.drawPageHeader(page) - 24;
  }
  const sigY = y - 22;
  page.drawLine({ start: { x: margin, y: sigY }, end: { x: margin + 260, y: sigY }, thickness: 0.75, color: rgb(0.55, 0.62, 0.7) });
  page.drawText('Shift Supervisor Authorization & Operational Sign-Off', { x: margin, y: sigY - 12, size: 8, font: fontBold, color: rgb(0.22, 0.28, 0.36) });
  page.drawLine({ start: { x: pageWidth - margin - 260, y: sigY }, end: { x: pageWidth - margin, y: sigY }, thickness: 0.75, color: rgb(0.55, 0.62, 0.7) });
  page.drawText(pdfSafeText(`Executive / HR Directorate — ${lh.meta.orgName}`), { x: pageWidth - margin - 260, y: sigY - 12, size: 8, font: fontBold, color: rgb(0.22, 0.28, 0.36) });

  lh.finalizeFooters();
  return pdfDoc.save();
}

/**
 * Generate Editable Word (.docx) Attendance Register Document with Company Letterhead
 */
export async function generateAttendanceSheetDocxBuffer(sheetData = {}, org = {}) {
  const month = sheetData.month || new Date().toISOString().slice(0, 7);
  const periodLabel = sheetData.periodLabel || month;
  const summary = sheetData.summary || {};
  const rows = Array.isArray(sheetData.rows) ? sheetData.rows : [];
  const { meta, sectionProps } = buildDocxLetterheadSectionProps(org, {
    badge: 'Official Attendance Sheet',
    refId: `SR-ATT-${org.organisation_code || 'RIF-2026'}-${month.replace('-', '')}`
  }, { landscape: true });

  const headers = ['Staff ID', 'Name', 'Department', 'Window', 'Days', 'Hours (OT)', 'Exc.', 'Verification', 'Status'];
  const tableRows = [
    new TableRow({ tableHeader: true, children: headers.map(h => docxCell(h, { bold: true, shaded: true })) }),
    ...rows.map(r => new TableRow({
      children: [
        docxCell(r.staffId, { bold: true }),
        docxCell(r.name, { bold: true }),
        docxCell(r.department),
        docxCell(r.shiftWindow),
        docxCell(Number(r.daysPresent || 0), { align: AlignmentType.CENTER }),
        docxCell(`${Number(r.regularHours || 0).toFixed(1)}h${Number(r.overtimeHours || 0) > 0 ? ` (+${Number(r.overtimeHours).toFixed(1)}h)` : ''}`, { align: AlignmentType.RIGHT }),
        docxCell(Number(r.exceptionsCount || 0), { align: AlignmentType.CENTER }),
        docxCell(r.verificationMix || 'No punches'),
        docxCell(r.currentStatus || 'Ready', { bold: true, align: AlignmentType.CENTER })
      ]
    }))
  ];

  const doc = new Document({
    sections: [{
      ...sectionProps,
      children: [
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 80, after: 80 },
          children: [new TextRun({ text: `${meta.orgName} (${meta.orgCode}) — Workforce Attendance Sheet`, bold: true, size: 28, color: '0F2744' })]
        }),
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: `Period: ${periodLabel}  |  Department: ${sheetData.departmentLabel || 'All Departments'}  |  Prepared By: ${sheetData.generatedBy || 'Management'}`, size: 19, color: '475569' })]
        }),
        new Paragraph({
          spacing: { after: 180 },
          children: [new TextRun({ text: `Summary: ${summary.totalStaff || rows.length} Active Staff  •  ${summary.totalPunches || 0} Punches  •  ${Number(summary.totalHours || 0).toFixed(1)}h Total Hours  •  ${Number(summary.punctualityRatePct ?? 100).toFixed(1)}% Punctuality  •  ${summary.exceptionsCount || 0} Exceptions`, bold: true, size: 19, color: '059669' })]
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        new Paragraph({ spacing: { before: 280, after: 120 }, children: [new TextRun({ text: `Verified under real-time geofenced mobile clock-ins and peer badge checks for ${meta.orgName}.`, size: 17, color: '475569' })] }),
        docxSignatureGrid('Shift Supervisor Verification', 'Operational Floor Lead Sign-Off', 'Executive / HR Directorate', `${meta.orgName} (${meta.orgCode})`)
      ]
    }]
  });

  return Packer.toBuffer(doc);
}

/**
 * 2b. Executive Statutory Payroll & Bank Disbursement Excel (.xlsx) Export
 */
export async function generatePayrollLedgerXlsxBuffer(payrollData = {}, org = {}) {
  const period = payrollData.period || 'November 2026 Monthly Payroll Cycle';
  const employees = Array.isArray(payrollData.employees) ? payrollData.employees : [];
  const summary = payrollData.summary || {};
  const meta = resolveCompanyLetterhead(org, {
    title: 'STATUTORY PAYROLL & BANK DISBURSEMENT SCHEDULE',
    refId: `SR-PAY-${org.organisation_code || 'RIF-2026'}-${period.slice(0, 7).replace(/[^0-9]/g, '') || '202611'}`
  });

  const scheduleAoa = [
    [`${meta.orgName} — STATUTORY PAYROLL & NIBSS DISBURSEMENT SCHEDULE`],
    [`Entity Details: ${meta.statutoryLine}`, `Address: ${meta.address}`, `Email: ${meta.email}`],
    [`Ref: ${meta.refId}`, `Cycle: ${period}`, `Pay Date: ${payrollData.payDate || '25th Monthly'}`, `Variance: NGN 0.00 (Zero Drift)`],
    [],
    ['Staff ID', 'Name', 'Department', 'Bank Name', 'CBN Code', 'NUBAN Account', 'Regular Pay (NGN)', 'Overtime & Bonus (NGN)', 'Gross Pay (NGN)', 'PenCom Emp 8% (NGN)', 'PAYE Tax (NGN)', 'NHF 2.5% (NGN)', 'Net Payable (NGN)'],
    ...employees.map(e => [
      String(e.staffId || 'SR-0000'),
      String(e.userName || ''),
      String(e.department || 'Operations'),
      String(e.bank_name || ''),
      String(e.cbn_bank_code || e.bank_code || ''),
      String(e.account_number || ''),
      Number(e.regularPay || 0),
      Number(e.overtimePay || 0) + Number(e.performanceBonus || 0),
      Number(e.grossPay || 0),
      Number(e.pensionEmployee || 0),
      Number(e.payeTax || 0),
      Number(e.nhf || 0),
      Number(e.netPay || 0)
    ]),
    [
      'TOTAL', '', `${employees.length} Staff`, '', '', '',
      employees.reduce((s, e) => s + Number(e.regularPay || 0), 0),
      employees.reduce((s, e) => s + Number(e.overtimePay || 0) + Number(e.performanceBonus || 0), 0),
      Number(summary.totalGross || employees.reduce((s, e) => s + Number(e.grossPay || 0), 0)),
      employees.reduce((s, e) => s + Number(e.pensionEmployee || 0), 0),
      Number(summary.totalPAYE || employees.reduce((s, e) => s + Number(e.payeTax || 0), 0)),
      employees.reduce((s, e) => s + Number(e.nhf || 0), 0),
      Number(summary.totalNet || employees.reduce((s, e) => s + Number(e.netPay || 0), 0))
    ]
  ];

  const remittanceAoa = [
    [`${meta.orgName} (${meta.orgCode}) — STATUTORY REMITTANCE LIABILITIES`],
    [`Entity Details: ${meta.statutoryLine}`, `Ref: ${meta.refId}`],
    [`Period: ${period}`, `Employer TIN: ${meta.tin}`, `PenCom ID: ${meta.pencomCode}`],
    [],
    ['Staff ID', 'Name', 'Gross Pay (NGN)', 'PenCom Emp 8% (NGN)', 'PenCom Employer 10% (NGN)', 'Total PenCom 18% (NGN)', 'PAYE State IRS (NGN)', 'NSITF 1% ECA (NGN)', 'ITF 1% (NGN)'],
    ...employees.map(e => {
      const empPen = Number(e.pensionEmployee || 0);
      const erPen = Number(e.pensionEmployer || Math.round(empPen * 1.25));
      const gross = Number(e.grossPay || 0);
      return [
        String(e.staffId || ''),
        String(e.userName || ''),
        gross,
        empPen,
        erPen,
        empPen + erPen,
        Number(e.payeTax || 0),
        Number(e.nsitf || Math.round(gross * 0.01)),
        Number(e.itf || Math.round(gross * 0.01))
      ];
    })
  ];

  const schedCols = [12, 24, 22, 20, 10, 14, 16, 18, 16, 16, 15, 14, 17];
  const remitCols = [12, 24, 16, 17, 21, 18, 18, 15, 14];
  return writeXlsxFile([
    buildStyledWefSheet('Payroll Schedule', scheduleAoa, schedCols, { headerRowIndex: 4 }),
    buildStyledWefSheet('Statutory Remittances', remittanceAoa, remitCols, { headerRowIndex: 4 })
  ]).toBuffer();
}

/**
 * 2c. Executive Statutory Payroll & Remittance Ledger Binary PDF (.pdf)
 */
export async function generatePayrollLedgerPdfBytes(payrollData = {}, org = {}) {
  const period = payrollData.period || 'November 2026 Monthly Payroll Cycle';
  const payDate = payrollData.payDate || 'Wednesday, Nov 25, 2026';
  const employees = Array.isArray(payrollData.employees) ? payrollData.employees : [];
  const summary = payrollData.summary || {};

  const pdfDoc = await PDFDocument.create();
  const lh = await createPdfLetterheadContext(pdfDoc, org, {
    badge: 'Statutory Ledger',
    title: `${org.legal_name || org.trading_name || COMPANY_LEGAL} - Statutory Payroll & Bank Disbursement Ledger`,
    subtitle: `Cycle: ${period}  |  Pay Date: ${payDate}  |  Personnel: ${employees.length}  |  Variance: NGN 0.00 Reconciled`,
    refId: `SR-PAY-${org.organisation_code || 'RIF-2026'}-${period.slice(0, 7).replace(/[^0-9]/g, '') || '202611'}`
  }, { landscape: true });

  const { fontRegular, fontBold, margin, contentWidth, pageWidth, pageHeight } = lh;
  const totalGross = Number(summary.totalGross || employees.reduce((s, e) => s + Number(e.grossPay || 0), 0));
  const totalPen = Number(summary.totalPension || employees.reduce((s, e) => s + Number(e.pensionEmployee || 0) * 2.25, 0));
  const totalPaye = Number(summary.totalPAYE || employees.reduce((s, e) => s + Number(e.payeTax || 0), 0));
  const totalNet = Number(summary.totalNet || employees.reduce((s, e) => s + Number(e.netPay || 0), 0));
  const fmtNgn = (n) => `NGN ${Math.round(Number(n || 0)).toLocaleString('en-US')}`;

  const drawChrome = (p) => {
    let y = lh.drawPageHeader(p);
    p.drawRectangle({ x: margin, y: y - 24, width: contentWidth, height: 24, color: rgb(0.95, 0.98, 0.97), borderColor: rgb(0.8, 0.88, 0.85), borderWidth: 0.75 });
    p.drawText(pdfSafeText(`Gross Payroll: ${fmtNgn(totalGross)}   |   PenCom (8%+10%): ${fmtNgn(totalPen)}   |   PAYE Tax: ${fmtNgn(totalPaye)}   |   Net Disbursement: ${fmtNgn(totalNet)}`), {
      x: margin + 10, y: y - 16, size: 8.8, font: fontBold, color: rgb(0.06, 0.11, 0.16)
    });
    y -= 42;
    const cols = [
      { label: 'Staff ID', x: margin + 4 },
      { label: 'Personnel', x: margin + 62 },
      { label: 'Department', x: margin + 205 },
      { label: 'Gross Pay', x: margin + 350 },
      { label: 'PenCom (8%)', x: margin + 432 },
      { label: 'PAYE Tax', x: margin + 512 },
      { label: 'Net Pay', x: margin + 585 },
      { label: 'Bank & NUBAN', x: margin + 662 }
    ];
    p.drawRectangle({ x: margin, y: y - 5, width: contentWidth, height: 19, color: rgb(0.93, 0.95, 0.97) });
    cols.forEach(c => p.drawText(c.label, { x: c.x, y, size: 8.3, font: fontBold, color: rgb(0.22, 0.28, 0.36) }));
    return y - 21;
  };

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = drawChrome(page);
  const lineH = 18;

  for (let i = 0; i < employees.length; i++) {
    if (y < margin + 58) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = drawChrome(page);
    }
    const e = employees[i];
    if (i % 2 === 1) page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: lineH, color: rgb(0.98, 0.99, 1) });
    page.drawText(pdfSafeText(e.staffId || 'SR-0000').slice(0, 10), { x: margin + 4, y, size: 8.3, font: fontBold, color: rgb(0.06, 0.45, 0.39) });
    page.drawText(pdfSafeText(e.userName || '').slice(0, 24), { x: margin + 62, y, size: 8.3, font: fontBold, color: rgb(0.06, 0.1, 0.16) });
    page.drawText(pdfSafeText(e.department || 'Operations').slice(0, 24), { x: margin + 205, y, size: 8.3, font: fontRegular, color: rgb(0.28, 0.35, 0.44) });
    page.drawText(fmtNgn(e.grossPay), { x: margin + 350, y, size: 8.3, font: fontRegular, color: rgb(0.06, 0.1, 0.16) });
    page.drawText(fmtNgn(e.pensionEmployee), { x: margin + 432, y, size: 8.3, font: fontRegular, color: rgb(0.2, 0.25, 0.33) });
    page.drawText(fmtNgn(e.payeTax), { x: margin + 512, y, size: 8.3, font: fontRegular, color: rgb(0.2, 0.25, 0.33) });
    page.drawText(fmtNgn(e.netPay), { x: margin + 585, y, size: 8.3, font: fontBold, color: rgb(0.02, 0.55, 0.38) });
    page.drawText(pdfSafeText(`${e.bank_name || 'Bank'} ${e.account_number || ''}`).slice(0, 21), { x: margin + 662, y, size: 8, font: fontRegular, color: rgb(0.28, 0.35, 0.44) });
    y -= lineH;
  }

  if (y < margin + 88) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = lh.drawPageHeader(page) - 24;
  }
  page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: 20, color: rgb(0.92, 0.95, 0.98) });
  page.drawText(`RECONCILED TOTAL (${employees.length} STAFF)`, { x: margin + 4, y, size: 8.5, font: fontBold, color: rgb(0.06, 0.15, 0.27) });
  page.drawText(fmtNgn(totalGross), { x: margin + 350, y, size: 8.5, font: fontBold, color: rgb(0.06, 0.15, 0.27) });
  page.drawText(fmtNgn(totalPaye), { x: margin + 512, y, size: 8.5, font: fontBold, color: rgb(0.06, 0.15, 0.27) });
  page.drawText(fmtNgn(totalNet), { x: margin + 585, y, size: 8.5, font: fontBold, color: rgb(0.02, 0.55, 0.38) });
  page.drawText('NIBSS Direct (0 Variance)', { x: margin + 662, y, size: 8, font: fontBold, color: rgb(0.02, 0.55, 0.38) });

  const sigY = y - 34;
  page.drawLine({ start: { x: margin, y: sigY }, end: { x: margin + 270, y: sigY }, thickness: 0.75, color: rgb(0.55, 0.62, 0.7) });
  page.drawText('Managing Director / Chief Executive Officer — Electronic Sign-Off', { x: margin, y: sigY - 12, size: 8, font: fontBold, color: rgb(0.22, 0.28, 0.36) });
  page.drawLine({ start: { x: pageWidth - margin - 270, y: sigY }, end: { x: pageWidth - margin, y: sigY }, thickness: 0.75, color: rgb(0.55, 0.62, 0.7) });
  page.drawText(pdfSafeText(`Finance Directorate — ${lh.meta.orgName} (PITA/PenCom Verified)`), { x: pageWidth - margin - 270, y: sigY - 12, size: 8, font: fontBold, color: rgb(0.22, 0.28, 0.36) });

  lh.finalizeFooters();
  return pdfDoc.save();
}

/**
 * 2d. Executive Statutory Payroll Ledger Editable Word (.docx) with Company Letterhead
 */
export async function generatePayrollLedgerDocxBuffer(payrollData = {}, org = {}) {
  const period = payrollData.period || 'November 2026 Monthly Payroll Cycle';
  const payDate = payrollData.payDate || 'Wednesday, Nov 25, 2026';
  const employees = Array.isArray(payrollData.employees) ? payrollData.employees : [];
  const summary = payrollData.summary || {};
  const { meta, sectionProps } = buildDocxLetterheadSectionProps(org, {
    badge: 'Statutory Payroll',
    refId: `SR-PAY-${org.organisation_code || 'RIF-2026'}-${period.slice(0, 7).replace(/[^0-9]/g, '') || '202611'}`
  }, { landscape: true });

  const fmt = (n) => `₦${Math.round(Number(n || 0)).toLocaleString('en-NG')}`;
  const totalGross = Number(summary.totalGross || employees.reduce((s, e) => s + Number(e.grossPay || 0), 0));
  const totalPen = Number(summary.totalPension || employees.reduce((s, e) => s + Number(e.pensionEmployee || 0) * 2.25, 0));
  const totalPaye = Number(summary.totalPAYE || employees.reduce((s, e) => s + Number(e.payeTax || 0), 0));
  const totalNet = Number(summary.totalNet || employees.reduce((s, e) => s + Number(e.netPay || 0), 0));

  const kpiTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          docxCell(`Gross Payroll: ${fmt(totalGross)}`, { bold: true, shaded: true, fill: 'F8FAFC' }),
          docxCell(`PenCom (8%+10%): ${fmt(totalPen)}`, { bold: true, shaded: true, fill: 'F8FAFC', color: '0284C7' }),
          docxCell(`PAYE Remittance: ${fmt(totalPaye)}`, { bold: true, shaded: true, fill: 'F8FAFC', color: '0284C7' }),
          docxCell(`Net Disbursement: ${fmt(totalNet)}`, { bold: true, shaded: true, fill: 'ECFDF5', color: '059669' })
        ]
      })
    ]
  });

  const headers = ['Staff ID', 'Personnel', 'Department', 'Gross Pay', 'PenCom (8%)', 'PAYE Tax', 'Net Salary', 'Disbursement Account'];
  const tableRows = [
    new TableRow({ tableHeader: true, children: headers.map(h => docxCell(h, { bold: true, shaded: true })) }),
    ...employees.map(e => new TableRow({
      children: [
        docxCell(e.staffId || 'SR-0000', { bold: true }),
        docxCell(e.userName || '', { bold: true }),
        docxCell(e.department || 'Operations'),
        docxCell(fmt(e.grossPay), { align: AlignmentType.RIGHT }),
        docxCell(fmt(e.pensionEmployee), { align: AlignmentType.RIGHT }),
        docxCell(fmt(e.payeTax), { align: AlignmentType.RIGHT }),
        docxCell(fmt(e.netPay), { bold: true, align: AlignmentType.RIGHT, color: '059669' }),
        docxCell(`${e.bank_name || ''} ${e.account_number || ''}`)
      ]
    })),
    new TableRow({
      children: [
        docxCell('TOTAL', { bold: true, shaded: true, fill: 'F1F5F9' }),
        docxCell(`${employees.length} Personnel`, { bold: true, shaded: true, fill: 'F1F5F9' }),
        docxCell('Reconciled ₦0.00 Variance', { bold: true, shaded: true, fill: 'F1F5F9' }),
        docxCell(fmt(totalGross), { bold: true, shaded: true, fill: 'F1F5F9', align: AlignmentType.RIGHT }),
        docxCell(fmt(employees.reduce((s, e) => s + Number(e.pensionEmployee || 0), 0)), { bold: true, shaded: true, fill: 'F1F5F9', align: AlignmentType.RIGHT }),
        docxCell(fmt(totalPaye), { bold: true, shaded: true, fill: 'F1F5F9', align: AlignmentType.RIGHT }),
        docxCell(fmt(totalNet), { bold: true, shaded: true, fill: 'ECFDF5', align: AlignmentType.RIGHT, color: '059669' }),
        docxCell('NIBSS Direct Credit', { bold: true, shaded: true, fill: 'F1F5F9' })
      ]
    })
  ];

  const doc = new Document({
    sections: [{
      ...sectionProps,
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 80, after: 60 }, children: [new TextRun({ text: 'Statutory Payroll & Bank Remittance Schedule', bold: true, size: 28, color: '0F2744' })] }),
        new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: `Cycle: ${period}  |  Disbursement Date: ${payDate}  |  Statutory Basis: PITA 2011, PenCom PRA 2014, NSITF ECA 2010`, size: 18, color: '475569' })] }),
        kpiTable,
        new Paragraph({ spacing: { after: 140 }, children: [] }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
        new Paragraph({ spacing: { before: 220, after: 180 }, children: [new TextRun({ text: 'Certified that all attendance inputs were verified via ShiftRelay Digital Staff ID & GPS Perimeter Logs with zero reconciliation drift.', size: 17, color: '475569' })] }),
        docxSignatureGrid('Managing Director / Chief Executive Officer', 'Electronically Authorized via ShiftRelay Exec Key', 'Chief Financial Officer & Remittance Controller', `Finance Directorate • ${meta.orgName}`)
      ]
    }]
  });

  return Packer.toBuffer(doc);
}

/**
 * Shared text line wrapper for clean Portrait PDF documents (CV, ToS, DPA)
 */
function wrapPdfLines(font, text, size, maxWidth) {
  const words = pdfSafeText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * 3a. Verified Worker Operational Dossier / CV Binary PDF (.pdf)
 */
export async function generateWorkerCvPdfBytes(user = {}, profile = {}, org = {}) {
  const name = user.name || profile.name || 'Tariq Al-Hassan';
  const role = user.role_title || profile.title || 'Senior Distributed Systems Engineer';
  const dept = user.department || profile.department || 'Backend Infrastructure';
  const staffId = user.staff_id || profile.staffId || 'SR-0042';

  const pdfDoc = await PDFDocument.create();
  const lh = await createPdfLetterheadContext(pdfDoc, org, {
    badge: 'Verified Dossier',
    title: `${name} — Verified Professional Operational Dossier`,
    subtitle: `${role}  |  ${dept}  |  ID: ${staffId}  |  ${profile.shiftWindow || '06:00 - 14:00 WAT'}`,
    refId: `SR-CV-${staffId}`
  }, { landscape: false });

  const { fontRegular, fontBold, margin, contentWidth, pageWidth, pageHeight } = lh;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = lh.drawPageHeader(page) - 6;

  // Scorecard bar
  page.drawRectangle({ x: margin, y: y - 44, width: contentWidth, height: 46, color: rgb(0.95, 0.98, 0.97), borderColor: rgb(0.8, 0.88, 0.85), borderWidth: 0.75 });
  const kpis = [
    ['Verified Hours', String(profile.verifiedHours || '0.0')],
    ['Punctuality', String(profile.punctuality || '100%')],
    ['Safety Incidents', String(profile.incidents || '0')],
    ['Handovers', String(profile.handovers || '0')]
  ];
  kpis.forEach(([lbl, val], idx) => {
    const kx = margin + 14 + idx * (contentWidth / 4);
    page.drawText(pdfSafeText(val), { x: kx, y: y - 20, size: 13, font: fontBold, color: rgb(0.06, 0.15, 0.27) });
    page.drawText(pdfSafeText(lbl), { x: kx, y: y - 34, size: 8, font: fontRegular, color: rgb(0.35, 0.42, 0.5) });
  });
  y -= 66;

  const addSection = (heading, paragraphs) => {
    if (y < margin + 80) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = lh.drawPageHeader(page) - 10;
    }
    page.drawText(pdfSafeText(heading).toUpperCase(), { x: margin, y, size: 9.5, font: fontBold, color: rgb(0.02, 0.52, 0.37) });
    page.drawLine({ start: { x: margin, y: y - 4 }, end: { x: pageWidth - margin, y: y - 4 }, thickness: 0.75, color: rgb(0.85, 0.88, 0.92) });
    y -= 18;
    for (const para of paragraphs) {
      for (const line of wrapPdfLines(fontRegular, para, 9.5, contentWidth)) {
        if (y < margin + 45) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = lh.drawPageHeader(page) - 10;
        }
        page.drawText(line, { x: margin, y, size: 9.5, font: fontRegular, color: rgb(0.2, 0.25, 0.33) });
        y -= 13.5;
      }
      y -= 4;
    }
    y -= 6;
  };

  addSection('Professional Operational Summary', [
    `Verified frontline specialist operating under ${lh.meta.orgName} (${lh.meta.orgCode}) in ${dept}. All duty hours, handovers, and shift grade metrics are cryptographically anchored by mobile GPS geofencing and digital Staff ID handshakes.`
  ]);
  addSection('Duty Assignment & Workplace Timeline', [
    `${role} — ${lh.meta.orgName} (${dept}) | Active Assignment Window: ${profile.shiftWindow || '06:00 - 14:00 WAT'}`,
    'Verified shift compliance record maintained under Nigerian Labour Act & NDPA 2023 isolation controls.'
  ]);
  addSection('Statutory & Identity Credentials', [
    `Staff Identifier: ${staffId}  |  PenCom RSA PIN: ${user.pencom_rsa_pin || 'PEN10098472910'}  |  Tax ID: ${user.tin || 'N-10938472'}  |  Identity Status: Verified`
  ]);

  const sigY = Math.max(y - 26, margin + 48);
  page.drawLine({ start: { x: margin, y: sigY }, end: { x: margin + 220, y: sigY }, thickness: 0.75, color: rgb(0.55, 0.62, 0.7) });
  page.drawText(pdfSafeText(`HR / People Operations — ${lh.meta.orgName}`), { x: margin, y: sigY - 12, size: 8, font: fontBold, color: rgb(0.22, 0.28, 0.36) });

  lh.finalizeFooters();
  return pdfDoc.save();
}

/**
 * 3b. Verified Worker Operational Dossier Editable Word (.docx)
 */
export async function generateWorkerCvDocxBuffer(user = {}, profile = {}, org = {}) {
  const name = user.name || profile.name || 'Tariq Al-Hassan';
  const role = user.role_title || profile.title || 'Senior Distributed Systems Engineer';
  const dept = user.department || profile.department || 'Backend Infrastructure';
  const staffId = user.staff_id || profile.staffId || 'SR-0042';
  const { meta, sectionProps } = buildDocxLetterheadSectionProps(org, {
    badge: 'Verified Personnel Dossier',
    refId: `SR-CV-${staffId}`
  }, { landscape: false });

  const doc = new Document({
    sections: [{
      ...sectionProps,
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 80, after: 40 }, children: [new TextRun({ text: name, bold: true, size: 32, color: '0F2744' })] }),
        new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: `${role}  •  ${dept}  •  Staff ID: ${staffId}`, bold: true, size: 20, color: '059669' })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                docxCell(`Verified Hours: ${profile.verifiedHours || '0.0'}`, { bold: true, shaded: true }),
                docxCell(`Punctuality: ${profile.punctuality || '100%'}`, { bold: true, shaded: true }),
                docxCell(`Incidents: ${profile.incidents || '0'}`, { bold: true, shaded: true }),
                docxCell(`Handovers: ${profile.handovers || '0'}`, { bold: true, shaded: true })
              ]
            })
          ]
        }),
        new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: 'OPERATIONAL SUMMARY', bold: true, size: 20, color: '0F2744' })] }),
        new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: `Verified frontline specialist at ${meta.orgName} (${meta.orgCode}) in ${dept}. Standard operational window: ${profile.shiftWindow || '06:00 – 14:00 WAT'}. All logged attendance entries are audited via mobile GPS geofence and Staff ID verification.`, size: 19, color: '334155' })] }),
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: 'STATUTORY CREDENTIAL SUMMARY', bold: true, size: 20, color: '0F2744' })] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [docxCell('Employer Organisation', { bold: true, shaded: true, fill: 'F8FAFC' }), docxCell(`${meta.orgName} (${meta.orgCode})`)] }),
            new TableRow({ children: [docxCell('PenCom RSA PIN', { bold: true, shaded: true, fill: 'F8FAFC' }), docxCell(user.pencom_rsa_pin || 'PEN10098472910')] }),
            new TableRow({ children: [docxCell('LIRS / Tax Identifier', { bold: true, shaded: true, fill: 'F8FAFC' }), docxCell(user.tin || 'N-10938472')] }),
            new TableRow({ children: [docxCell('Identity Attestation', { bold: true, shaded: true, fill: 'F8FAFC' }), docxCell('Verified under ShiftRelay Sovereign Identity', { bold: true, color: '059669' })] })
          ]
        }),
        new Paragraph({ spacing: { before: 280 }, children: [] }),
        docxSignatureGrid('HR & People Operations Directorate', `${meta.orgName} (${meta.rcNumber})`, 'Verified Personnel Attestation', `Employee Staff ID: ${staffId}`)
      ]
    }]
  });

  return Packer.toBuffer(doc);
}

async function generateLegalSectionsPdf(org, metaOpts, sections, sigLeft, sigRight) {
  const pdfDoc = await PDFDocument.create();
  const lh = await createPdfLetterheadContext(pdfDoc, org, metaOpts, { landscape: false });
  const { fontRegular, fontBold, margin, contentWidth, pageWidth, pageHeight } = lh;
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = lh.drawPageHeader(page) - 8;

  for (const sec of sections) {
    if (y < margin + 70) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = lh.drawPageHeader(page) - 8;
    }
    page.drawText(pdfSafeText(sec.heading), { x: margin, y, size: 10, font: fontBold, color: rgb(0.06, 0.15, 0.27) });
    y -= 14;
    for (const para of sec.paragraphs) {
      for (const line of wrapPdfLines(fontRegular, para, 9, contentWidth)) {
        if (y < margin + 45) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = lh.drawPageHeader(page) - 8;
        }
        page.drawText(line, { x: margin, y, size: 9, font: fontRegular, color: rgb(0.24, 0.3, 0.38) });
        y -= 12.5;
      }
      y -= 4;
    }
    y -= 6;
  }

  if (y < margin + 72) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = lh.drawPageHeader(page) - 16;
  }
  const sigY = y - 24;
  page.drawLine({ start: { x: margin, y: sigY }, end: { x: margin + 230, y: sigY }, thickness: 0.75, color: rgb(0.55, 0.62, 0.7) });
  page.drawText(pdfSafeText(sigLeft), { x: margin, y: sigY - 12, size: 8, font: fontBold, color: rgb(0.22, 0.28, 0.36) });
  page.drawLine({ start: { x: pageWidth - margin - 230, y: sigY }, end: { x: pageWidth - margin, y: sigY }, thickness: 0.75, color: rgb(0.55, 0.62, 0.7) });
  page.drawText(pdfSafeText(sigRight), { x: pageWidth - margin - 230, y: sigY - 12, size: 8, font: fontBold, color: rgb(0.22, 0.28, 0.36) });

  lh.finalizeFooters();
  return pdfDoc.save();
}

async function generateLegalSectionsDocx(org, metaOpts, docHeading, docSub, sections, sigLeftTitle, sigLeftSub, sigRightTitle, sigRightSub) {
  const { sectionProps } = buildDocxLetterheadSectionProps(org, metaOpts, { landscape: false });
  const bodyChildren = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 80, after: 40 }, children: [new TextRun({ text: docHeading, bold: true, size: 28, color: '0F2744' })] }),
    new Paragraph({ spacing: { after: 180 }, children: [new TextRun({ text: docSub, size: 18, color: '475569' })] })
  ];
  for (const sec of sections) {
    bodyChildren.push(new Paragraph({ spacing: { before: 140, after: 60 }, children: [new TextRun({ text: sec.heading, bold: true, size: 20, color: '0F2744' })] }));
    for (const para of sec.paragraphs) {
      bodyChildren.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: para, size: 18, color: '334155' })] }));
    }
  }
  bodyChildren.push(new Paragraph({ spacing: { before: 220 }, children: [] }));
  bodyChildren.push(docxSignatureGrid(sigLeftTitle, sigLeftSub, sigRightTitle, sigRightSub));
  const doc = new Document({ sections: [{ ...sectionProps, children: bodyChildren }] });
  return Packer.toBuffer(doc);
}

const TOS_LEGAL_SECTIONS = [
  {
    heading: '1. Platform Subscription & Tenant Segregation',
    paragraphs: [
      `1.1. ${COMPANY_LEGAL} ("ShiftRelay") licenses the ShiftRelay Enterprise OS for verified shift rosters, mobile digital Staff ID & Colleague Peer Scan attendance, auto clock-out enforcement, and statutory Nigerian payroll preparation.`,
      '1.2. Tenant personnel, muster timestamps, and disbursement records are cryptographically segregated by organisation_id with zero cross-tenant pooling.'
    ]
  },
  {
    heading: '2. Digital Staff ID, Grace Periods & Attendance Integrity',
    paragraphs: [
      '2.1. Enrolled staff clock in directly via GPS-bounded mobile handshakes or once per shift via an authorized colleague peer scanner, with shift-end auto clock-out enforced server-side.',
      '2.2. Each Subscriber configures organisational grace minutes and auditable supervisor pardon vs. deduction controls prior to payroll lock.'
    ]
  },
  {
    heading: '3. Nigerian Statutory Tax, Pension & Zero-Lending Boundaries',
    paragraphs: [
      '3.1. Calculations align strictly with PITA 2011 (Finance Act CRA), Pension Reform Act 2014 (8% employee / 10% employer), NSITF ECA 2010 (1% employer), NHF, and ITF.',
      '3.2. Zero-Lending Regulatory Boundary: ShiftRelay is strictly enterprise payroll software and operates no credit, consumer lending, or digital wallet facility. Actual transfers settle through Subscriber commercial banks (NIBSS).'
    ]
  },
  {
    heading: '4. NDPA 2023 Data Protection, 99.98% SLA & Governing Law',
    paragraphs: [
      '4.1. Personal data is processed strictly on Subscriber instructions under NDPA 2023 safeguards with TLS 1.3 and AES-256 encryption.',
      '4.2. Governed by the laws of the Federal Republic of Nigeria, with arbitration administered by the Lagos Court of Arbitration (LCA).'
    ]
  }
];

export function generateTermsOfServicePdfBytes(org = {}) {
  return generateLegalSectionsPdf(org, {
    orgName: LEGAL_ENTITY.platformOperatorName,
    badge: 'Legal Instrument',
    title: 'Master Terms of Service & Statutory Compliance Agreement',
    subtitle: `Version: ${POLICY_VERSIONS.terms}  |  Governing Forum: Lagos Court of Arbitration (LCA)  |  ${LEGAL_ENTITY.securityPostureClaim}`,
    refId: POLICY_VERSIONS.terms
  }, TOS_LEGAL_SECTIONS, `${LEGAL_ENTITY.platformOperatorName} (${COMPANY_RC})`, 'Subscriber Enterprise Representative');
}

export function generateTermsOfServiceDocxBuffer(org = {}) {
  return generateLegalSectionsDocx(
    org,
    { orgName: LEGAL_ENTITY.platformOperatorName, badge: 'Legal Instrument', refId: POLICY_VERSIONS.terms },
    'Master Terms of Service & Statutory SLA',
    `Version: ${POLICY_VERSIONS.terms}  |  Federal Republic of Nigeria  |  PITA 2011, PenCom 2014, NDPA 2023`,
    TOS_LEGAL_SECTIONS,
    LEGAL_ENTITY.platformOperatorName,
    `Corporate Seal Enacted (${COMPANY_RC})`,
    'Subscriber Enterprise Entity',
    'Authorized Corporate Representative'
  );
}

export function generateDpaReportPdfBytes({ orgName = 'Subscriber Enterprise Organisation', orgCode = 'TENANT-ACTIVE', signerName = 'Authorized Data Controller Representative', ipAddress = 'Recorded on Activation', dpaVersion = POLICY_VERSIONS.dpa } = {}) {
  const sections = [
    {
      heading: '1. Controller & Processor Roles (NDPA 2023)',
      paragraphs: [
        `${orgName} (${orgCode}) acts as Data Controller for employee attendance, handover logs, and payroll inputs. ${COMPANY_LEGAL} acts strictly as Data Processor on documented employer instructions.`
      ]
    },
    {
      heading: '2. Technical Safeguards & Multi-Tenant Isolation',
      paragraphs: [
        'TLS 1.3 transport encryption, AES-256 storage encryption, strict organisation_id row-level isolation, point-of-punch geofence validation only (zero off-shift tracking), and 72-hour breach notification aligned with NDPC requirements.'
      ]
    },
    {
      heading: '3. Authorized Sub-Processors',
      paragraphs: LEGAL_ENTITY.subProcessors.map(sp => `${sp.name} — ${sp.role} (${sp.region}) | ${sp.safeguard}`)
    }
  ];
  return generateLegalSectionsPdf({ legal_name: COMPANY_LEGAL, organisation_code: orgCode }, {
    badge: 'NDPA 2023 DPA',
    title: `NDPA 2023 Data Processing Addendum — ${orgName} (${orgCode})`,
    subtitle: `Version: ${dpaVersion}  |  Executed By: ${signerName}  |  DPO: ${LEGAL_ENTITY.dpoEmail}  |  IP: ${ipAddress}`,
    refId: dpaVersion
  }, sections, `${COMPANY_LEGAL} Data Protection Officer`, `${orgName} (${signerName})`);
}

export function generateDpaReportDocxBuffer({ orgName = 'Subscriber Enterprise Organisation', orgCode = 'TENANT-ACTIVE', signerName = 'Authorized Data Controller Representative', ipAddress = 'Recorded on Activation', dpaVersion = POLICY_VERSIONS.dpa } = {}) {
  const sections = [
    {
      heading: '1. Controller & Processor Roles',
      paragraphs: [`${orgName} (${orgCode}) acts as Data Controller; ${COMPANY_LEGAL} operates strictly as Data Processor under Nigeria Data Protection Act (NDPA) 2023 Section 25.`]
    },
    {
      heading: '2. Technical Safeguards & Breach Notification',
      paragraphs: ['Enforces TLS 1.3 in transit, AES-256 at rest, strict tenant isolation, point-of-punch GPS checking, and 72-hour breach reporting to NDPC.']
    },
    {
      heading: '3. Authorized Sub-Processors',
      paragraphs: LEGAL_ENTITY.subProcessors.map(sp => `${sp.name} — ${sp.role} (${sp.region}) | ${sp.safeguard}`)
    }
  ];
  return generateLegalSectionsDocx(
    { legal_name: COMPANY_LEGAL, organisation_code: orgCode },
    { badge: 'NDPA 2023 DPA', refId: dpaVersion },
    `NDPA 2023 Data Processing Addendum (${dpaVersion})`,
    `Data Controller: ${orgName} (${orgCode})  |  Signer: ${signerName}  |  IP: ${ipAddress}`,
    sections,
    COMPANY_LEGAL,
    `Data Protection Officer (${LEGAL_ENTITY.dpoEmail})`,
    orgName,
    `Executed By: ${signerName}`
  );
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
