import { Observable } from "rxjs";
import HttpCommunicator from "../../support/http/HttpCommunicator";
import Container from "../../support/ioc/Container";

export default class HistoryService {
    private http: HttpCommunicator;

    constructor(container: Container) {
        this.http = container.get('https');
    }

    getAll(dishId: string, offset: number, limit: number): Observable<History[]> {
        return this.http.get('/history?dishId=' + dishId, { offset, limit, sort: 'finishedAt:DESC' });
    }
}