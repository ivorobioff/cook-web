import { Observable } from "rxjs";
import HttpCommunicator from "../../support/http/HttpCommunicator";
import Container from "../../support/ioc/Container";
import Schedule, { ScheduleToPersist } from "../models/Schedule";

export default class ScheduleService {
    private http: HttpCommunicator;

    constructor(container: Container) {
        this.http = container.get('https');
    }

    getAll(offset: number, limit: number): Observable<Schedule[]> {
        return this.http.get('/schedules', { offset, limit });
    }
    
    create(schedule: ScheduleToPersist): Observable<Schedule> {
        return this.http.post('/schedules', schedule);
    }

    remove(id: string): Observable<any> {
        return this.http.delete('/schedules/' + id);
    }
}