export function repairTimelineLines(value: string | null | undefined): string[] {
    if (!value) return [];
    return value
        .replace(/\r\n?/g, "\n")
        .replace(/\s*[;；|]\s*/g, "\n")
        .replace(/\s+(?=(?:Số serial|Tình trạng|Phụ kiện|Lỗi khách(?: phản ánh| báo)?|Lỗi tiếp nhận|Kết quả chẩn đoán|Đề xuất sửa chữa|Ghi chú)\s*:)/giu, "\n")
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
}
