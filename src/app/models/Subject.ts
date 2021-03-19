export default interface Subject {
    id: string;
    name: string;
    notes?: string;
    createdAt: string;
    opinion: string;
}

export interface SubjectToPersist {
    name?: string;
    notes?: string;
    opinion?: string;
}