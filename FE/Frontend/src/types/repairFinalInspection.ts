export interface RepairFinalInspectionRequest {
    deviceWorksNormally: boolean;
    mainFunctionsWork: boolean;
    noNewIssues: boolean;
    completionInfo?: string;
    complete: boolean;
}

export interface RepairFinalInspection {
    id: number;
    ticketId: number;
    ticketCode: string;
    deviceWorksNormally: boolean;
    mainFunctionsWork: boolean;
    noNewIssues: boolean;
    completionInfo: string | null;
    inspectedBy: string;
    inspectedAt: string;
    completedAt: string | null;
    ticketStatus: string;
}
