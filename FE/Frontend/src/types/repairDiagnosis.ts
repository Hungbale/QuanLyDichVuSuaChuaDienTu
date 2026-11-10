export interface RepairDiagnosis {
    id: number;
    ticketId: number;
    ticketCode: string;
    device: string;
    customerName: string;
    customerReportedIssue: string | null;
    diagnosisResult: string;
    repairProposal: string;
    technicalNote: string | null;
    diagnosedBy: string;
    diagnosedAt: string;
    ticketStatus: string;
}

export interface RepairDiagnosisRequest {
    diagnosisResult: string;
    repairProposal: string;
    technicalNote?: string;
}
