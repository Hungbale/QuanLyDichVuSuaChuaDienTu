export type ReportCell = string | number | null | undefined;

export interface ReportWorksheet {
    name: string;
    rows: ReportCell[][];
    headerRows?: number[];
    totalRows?: number[];
    sectionRows?: number[];
}

const cellStyleId = (sheet: ReportWorksheet, rowIndex: number, columnIndex: number) => {
    const row = sheet.rows[rowIndex] ?? [];
    const value = row[columnIndex];
    const firstCell = row[0];
    const isTitle = rowIndex === 0;
    const isHeader = sheet.headerRows?.includes(rowIndex)
        || row.some((cell) => typeof cell === "string" && /^(chỉ số|trạng thái|nhân viên|khách hàng|loại hồ sơ)$/i.test(cell.trim()));
    const isTotal = sheet.totalRows?.includes(rowIndex)
        || (typeof firstCell === "string" && /^tổng(?:\s|$)/i.test(firstCell.trim()));
    const isSectionTitle = sheet.sectionRows?.includes(rowIndex)
        || (typeof firstCell === "string" && /^(trạng thái lịch hẹn|trạng thái phiếu sửa chữa|chỉ số chưa có dữ liệu)$/i.test(firstCell.trim()));
    if (isTitle) return 1;
    if (isTotal) return 4;
    if (isSectionTitle) return 3;
    if (isHeader) return 2;
    if (typeof value === "number") return rowIndex % 2 === 0 ? 6 : 5;
    return rowIndex % 2 === 0 ? 6 : 5;
};

const columnWidth = (sheet: ReportWorksheet, column: number) => {
    const values = sheet.rows
        .filter((row, rowIndex) => rowIndex !== 0 && row.filter((cell) => cell != null && cell !== "").length > 1)
        .map((row) => String(row[column] ?? ""));
    const longest = Math.max(12, ...values.map((value) => value.length));
    return Math.min(100, longest + 3);
};

const encoder = new TextEncoder();
const crcTable = Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
});

const crc32 = (bytes: Uint8Array) => {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
};

const xmlEscape = (value: string) => value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const columnName = (column: number) => {
    let value = column + 1;
    let name = "";
    while (value > 0) {
        const remainder = (value - 1) % 26;
        name = String.fromCharCode(65 + remainder) + name;
        value = Math.floor((value - 1) / 26);
    }
    return name;
};

const worksheetXml = (sheet: ReportWorksheet) => {
    const { rows } = sheet;
    const columnCount = Math.max(1, ...rows.map((row) => row.length));
    const widths = Array.from({ length: columnCount }, (_, column) => {
        return `<col min="${column + 1}" max="${column + 1}" width="${columnWidth(sheet, column)}" customWidth="1"/>`;
    }).join("");
    const sheetRows = rows.map((row, rowIndex) => {
        const cells = Array.from({ length: columnCount }, (_, columnIndex) => {
            const value = row[columnIndex];
            const address = `${columnName(columnIndex)}${rowIndex + 1}`;
            const style = cellStyleId(sheet, rowIndex, columnIndex);
            if (typeof value === "number" && Number.isFinite(value)) {
                return `<c r="${address}" s="${style}" t="n"><v>${value}</v></c>`;
            }
            if (value == null || value === "") return `<c r="${address}" s="${style}"/>`;
            return `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(String(value))}</t></is></c>`;
        }).join("");
        const height = rowIndex === 0 ? 30 : Math.min(90, Math.max(22, ...row.map((cell) => typeof cell === "string" ? Math.ceil(cell.length / 80) * 20 : 22)));
        return `<row r="${rowIndex + 1}" ht="${height}" customHeight="1">${cells}</row>`;
    }).join("");
    const lastColumn = columnName(Math.max(0, columnCount - 1));
    const lastRow = Math.max(rows.length, 1);
    const headerRow = sheet.name === "Tổng quan" ? 6 : 2;
    const autoFilter = sheet.name !== "Tổng quan" && rows.length >= headerRow
        ? `<autoFilter ref="A${headerRow}:${lastColumn}${lastRow}"/>`
        : "";

    const mergeTitle = `<mergeCells count="1"><mergeCell ref="A1:${lastColumn}1"/></mergeCells>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="21"/><cols>${widths}</cols><sheetData>${sheetRows}</sheetData>${autoFilter}${mergeTitle}</worksheet>`;
};

const zipStore = (files: Array<{ name: string; content: string }>) => {
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;
    const makeHeader = (length: number, values: Array<[number, number, number]>) => {
        const bytes = new Uint8Array(length);
        const view = new DataView(bytes.buffer);
        for (const [position, value, size] of values) {
            if (size === 2) view.setUint16(position, value, true);
            else view.setUint32(position, value, true);
        }
        return bytes;
    };

    for (const file of files) {
        const name = encoder.encode(file.name);
        const data = encoder.encode(file.content);
        const checksum = crc32(data);
        const localHeader = makeHeader(30, [
            [0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2],
            [10, 0, 2], [12, 0x21, 2], [14, checksum, 4], [18, data.length, 4],
            [22, data.length, 4], [26, name.length, 2], [28, 0, 2],
        ]);
        localParts.push(localHeader, name, data);

        const centralHeader = makeHeader(46, [
            [0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2],
            [10, 0, 2], [12, 0, 2], [14, 0x21, 2], [16, checksum, 4],
            [20, data.length, 4], [24, data.length, 4], [28, name.length, 2],
            [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 4], [42, offset, 4],
        ]);
        centralParts.push(centralHeader, name);
        offset += localHeader.length + name.length + data.length;
    }

    const centralDirectory = new Uint8Array(centralParts.reduce((sum, part) => sum + part.length, 0));
    let centralOffset = 0;
    for (const part of centralParts) {
        centralDirectory.set(part, centralOffset);
        centralOffset += part.length;
    }
    const endRecord = makeHeader(22, [
        [0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, files.length, 2],
        [10, files.length, 2], [12, centralDirectory.length, 4],
        [16, offset, 4], [20, 0, 2],
    ]);
    const allParts = [...localParts, centralDirectory, endRecord];
    const workbookBytes = new Uint8Array(allParts.reduce((sum, part) => sum + part.length, 0));
    let workbookOffset = 0;
    for (const part of allParts) {
        workbookBytes.set(part, workbookOffset);
        workbookOffset += part.length;
    }
    return new Blob([workbookBytes.buffer as ArrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
};

export const createReportWorkbook = (worksheets: ReportWorksheet[]) => {
    const sheets = worksheets.slice(0, 3);
    const sheetContentTypes = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
    const workbookSheets = sheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name.slice(0, 31))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
    const workbookRelationships = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="10"/><color rgb="FF263445"/><name val="Aptos"/><family val="2"/></font><font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/><family val="2"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/><family val="2"/></font></fonts>
<fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF24415E"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF496D8E"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EFF5"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9F1EA"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F6F9"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFB8C5D1"/></left><right style="thin"><color rgb="FFB8C5D1"/></right><top style="thin"><color rgb="FFB8C5D1"/></top><bottom style="thin"><color rgb="FFB8C5D1"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" alignment="vertical center wrapText"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" alignment="vertical center wrapText"/><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" alignment="vertical center wrapText"/><xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" alignment="vertical center wrapText"/><xf numFmtId="3" fontId="0" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" alignment="horizontal right vertical center"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" alignment="vertical center wrapText"/><xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1" alignment="vertical center wrapText"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const files = [
        { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetContentTypes}</Types>` },
        { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
        { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>` },
        { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRelationships}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
        { name: "xl/styles.xml", content: styles },
        ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, content: worksheetXml(sheet) })),
    ];
    return zipStore(files);
};
