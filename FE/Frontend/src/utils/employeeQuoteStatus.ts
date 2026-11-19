const quoteReadyStatuses = new Set([
    "diagnosing",
    "diagnosed",
    "đang kiểm tra",
    "đã kiểm tra",
    "chờ báo giá",
    "đã báo giá",
    "waiting_for_quote",
    "waiting_for_quote_creation",
]);

export const isQuoteReadyForEmployee = (status: string) =>
    quoteReadyStatuses.has(status.trim().toLocaleLowerCase("vi"));
