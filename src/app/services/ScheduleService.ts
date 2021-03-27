import { Observable } from "rxjs";
import { DataFormResult } from "../../support/form/components/DataForm";
import HttpCommunicator from "../../support/http/HttpCommunicator";
import Container from "../../support/ioc/Container";
import Schedule, { FinishedSchedule, ScheduleToPersist } from "../models/Schedule";

export default class ScheduleService {
    private http: HttpCommunicator;

    constructor(container: Container) {
        this.http = container.get('https');
    }

    getAll(offset: number, limit: number, filter?: DataFormResult): Observable<Schedule[]> {
        return this.http.get('/schedules', { offset, limit, ...filter });
    }
    
    create(schedule: ScheduleToPersist): Observable<Schedule> {
        return this.http.post('/schedules', schedule);
    }

    remove(id: string): Observable<any> {
        return this.http.delete('/schedules/' + id);
    }

    finish(id: string, finished: FinishedSchedule): Observable<any> {
        return this.http.post('/schedules/' + id + '/finish', finished);
    }
}