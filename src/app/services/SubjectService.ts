import Subject, { SubjectToPersist } from "../models/Subject";
import { Observable } from "rxjs";
import HttpCommunicator from "../../support/http/HttpCommunicator";
import Container from "../../support/ioc/Container";

export class SubjectService {

    private http: HttpCommunicator;

    constructor(container: Container) {
        this.http = container.get('https');
    }

    getAll(offset: number, limit: number, term?: string): Observable<Subject[]> {
        return this.http.get('/subjects', {
           offset, limit, sort: 'createdAt:DESC', term
        });
    }
    
    create(subject: SubjectToPersist): Observable<Subject> {
        return this.http.post('/subjects', subject);
    }

    update(id: string, subject: SubjectToPersist): Observable<any> {
        return this.http.patch('/subjects/' + id, subject);
    }

    remove(id: string): Observable<any> {
        return this.http.delete('/subjects/' + id);
    }
}