import fs from 'fs';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  UnderlineType
} from 'docx';

function convertMarkdownToDocx(mdContent) {
  const lines = mdContent.split(/\r?\n/);
  const children = [];

  let inCodeBlock = false;
  let codeBuffer = [];
  let tableBuffer = [];
  let inTable = false;

  const flushTable = () => {
    if (tableBuffer.length === 0) return;

    // Filter out separator rows like |---|---|
    const validRows = tableBuffer.filter(row => !row.every(cell => /^[-: ]+$/.test(cell.trim())));
    if (validRows.length === 0) {
      tableBuffer = [];
      inTable = false;
      return;
    }

    const colCount = Math.max(...validRows.map(r => r.length));
    const tableRows = validRows.map((rowCells, rIdx) => {
      const isHeader = rIdx === 0;
      const cells = [];

      for (let c = 0; c < colCount; c++) {
        const text = (rowCells[c] || '').trim();
        cells.push(
          new TableCell({
            width: { size: Math.floor(100 / colCount), type: WidthType.PERCENTAGE },
            shading: isHeader
              ? { type: ShadingType.CLEAR, fill: '0F172A', color: 'FFFFFF' }
              : rIdx % 2 === 1
              ? { type: ShadingType.CLEAR, fill: 'F8FAFC' }
              : undefined,
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: text.replace(/\*\*/g, ''),
                    bold: isHeader || text.startsWith('**'),
                    color: isHeader ? 'FFFFFF' : '1E293B',
                    size: isHeader ? 20 : 19,
                    font: 'Calibri'
                  })
                ]
              })
            ]
          })
        );
      }
      return new TableRow({ children: cells });
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
          insideVertical: { style: BorderStyle.NONE }
        }
      })
    );
    children.push(new Paragraph({ spacing: { after: 180 } }));
    tableBuffer = [];
    inTable = false;
  };

  const parseInlineRuns = (text, isHeader = false) => {
    // Basic bold splitter
    const parts = text.split(/(\*\*.*?\*\*)/g);
    const runs = [];

    parts.forEach(part => {
      if (!part) return;
      if (part.startsWith('**') && part.endsWith('**')) {
        runs.push(
          new TextRun({
            text: part.slice(2, -2),
            bold: true,
            font: 'Calibri',
            color: isHeader ? '0F172A' : '0F172A'
          })
        );
      } else {
        runs.push(
          new TextRun({
            text: part,
            font: 'Calibri',
            color: isHeader ? '0F172A' : '334155'
          })
        );
      }
    });

    return runs;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block handling
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // flush code block
        const codeText = codeBuffer.join('\n');
        children.push(
          new Paragraph({
            shading: { type: ShadingType.CLEAR, fill: '0F172A' },
            spacing: { before: 140, after: 140 },
            children: [
              new TextRun({
                text: codeText,
                font: 'Consolas',
                color: '38BDF8',
                size: 18
              })
            ]
          })
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        if (inTable) flushTable();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Markdown table rows
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());
      tableBuffer.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Horizontal Rule
    if (/^---|^___|^\*\*\*/.test(line.trim())) {
      children.push(
        new Paragraph({
          border: { bottom: { color: 'CBD5E1', space: 6, style: BorderStyle.SINGLE, size: 6 } },
          spacing: { before: 200, after: 200 }
        })
      );
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.TITLE,
          children: [
            new TextRun({
              text: line.replace(/^#\s+/, ''),
              bold: true,
              size: 44,
              font: 'Calibri',
              color: '0F172A'
            })
          ],
          spacing: { before: 320, after: 140 }
        })
      );
      continue;
    }

    if (line.startsWith('## ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: line.replace(/^##\s+/, ''),
              bold: true,
              size: 32,
              font: 'Calibri',
              color: '1E3A8A'
            })
          ],
          spacing: { before: 300, after: 120 }
        })
      );
      continue;
    }

    if (line.startsWith('### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: line.replace(/^###\s+/, ''),
              bold: true,
              size: 26,
              font: 'Calibri',
              color: '047857'
            })
          ],
          spacing: { before: 240, after: 100 }
        })
      );
      continue;
    }

    if (line.startsWith('#### ')) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [
            new TextRun({
              text: line.replace(/^####\s+/, ''),
              bold: true,
              size: 22,
              font: 'Calibri',
              color: '475569'
            })
          ],
          spacing: { before: 180, after: 80 }
        })
      );
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      const qText = line.trim().replace(/^>\s*/, '');
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: qText,
              italics: true,
              color: '475569',
              size: 20,
              font: 'Calibri'
            })
          ],
          border: { left: { color: '3B82F6', size: 24, style: BorderStyle.SINGLE, space: 10 } },
          spacing: { before: 120, after: 120 }
        })
      );
      continue;
    }

    // Bullet points
    if (/^\s*[-*]\s+/.test(line)) {
      const bText = line.replace(/^\s*[-*]\s+/, '');
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: parseInlineRuns(bText),
          spacing: { before: 40, after: 40 }
        })
      );
      continue;
    }

    // Numbered lists
    if (/^\s*\d+\.\s+/.test(line)) {
      const nText = line.replace(/^\s*\d+\.\s+/, '');
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: line.match(/^\s*(\d+\.)\s+/)[1] + ' ', bold: true, color: '0F172A', font: 'Calibri' }),
            ...parseInlineRuns(nText)
          ],
          spacing: { before: 50, after: 50 }
        })
      );
      continue;
    }

    // Normal paragraph
    if (line.trim().length > 0) {
      children.push(
        new Paragraph({
          children: parseInlineRuns(line.trim()),
          spacing: { before: 60, after: 80 },
          alignment: AlignmentType.LEFT
        })
      );
    }
  }

  if (inTable) flushTable();

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 }
          }
        },
        children
      }
    ]
  });
}

async function run() {
  const mdPath = path.resolve('ShiftRelay-Enterprise-Business-Plan.md');
  const docxPath = path.resolve('ShiftRelay-Enterprise-Business-Plan.docx');

  if (!fs.existsSync(mdPath)) {
    console.error('Markdown file not found:', mdPath);
    process.exit(1);
  }

  const content = fs.readFileSync(mdPath, 'utf8');
  console.log('Generating Microsoft Word (.docx) document...');
  const doc = convertMarkdownToDocx(content);

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(docxPath, buffer);
  console.log('Successfully saved to:', docxPath);
  console.log('File size:', (buffer.length / 1024).toFixed(1) + ' KB');
}

run().catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
