import axiosClient from "./axiosClient";

export interface ReportMetric {
    key: string;
    label: string;
    value: number | null;
}

export interface PeriodSystemReport {
    fromDate: string;
    toDate: string;
    hasData: boolean;
    message: string;
    metrics: ReportMetric[];
    appointmentStatusCounts: Record<string, number>;
    repairTicketStatusCounts: Record<string, number>;
    unavailableMetrics: string[];
}

export interface ComparisonMetric {
    key: string;
    label: string;
    currentPeriod: number | null;
    previousPeriod: number | null;
    difference: number | null;
    percentChange: number | null;
}

export interface ComparisonSystemReport extends Omit<PeriodSystemReport, "metrics"> {
    comparisonFromDate: string;
    comparisonToDate: string;
    metrics: ComparisonMetric[];
}

export type ReportRange = { fromDate: string; toDate: string };

export const getSystemReportApi = async (
    range: ReportRange,
): Promise<ComparisonSystemReport> => {
    const response = await axiosClient.get<ComparisonSystemReport>("/api/admin/reports", { params: range });
    return response.data;
};

export const getPeriodSystemReportApi = async (
    range: ReportRange,
): Promise<PeriodSystemReport> => {
    const response = await axiosClient.get<PeriodSystemReport>("/api/admin/reports/period", { params: range });
    return response.data;
};

export const exportSystemReportApi = async (
    range: ReportRange,
    comparison = false,
): Promise<Blob> => {
    const endpoint = comparison ? "/api/admin/reports/export/excel" : "/api/admin/reports/period/export/excel";
    const response = await axiosClient.get<Blob>(endpoint, {
        params: range,
        responseType: "blob",
    });
    return response.data;
};
