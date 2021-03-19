import { Observable } from "rxjs";
import HttpCommunicator from "../../support/http/HttpCommunicator";
import Container from "../../support/ioc/Container";
import Dish, { DishToPersist } from "../models/Dish";

export default class DishService {
    private http: HttpCommunicator;

    constructor(container: Container) {
        this.http = container.get('https');
    }

    getAll(offset: number, limit: number, filter?: {[name: string]: string}): Observable<Dish[]> {
        return this.http.get('/dishes', { offset, limit, ...filter});
    }
    
    create(dish: DishToPersist): Observable<Dish> {
        return this.http.post('/dishes', dish);
    }
}