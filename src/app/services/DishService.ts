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

    getAllLightweight(): Observable<Dish[]> {
        return this.http.get('/lightweight-dishes');
    }
    
    create(dish: DishToPersist): Observable<Dish> {
        return this.http.post('/dishes', dish);
    }

    update(id: string, dish: DishToPersist): Observable<Dish> {
        return this.http.patch('/dishes/' + id, dish);
    }

    remove(id: string): Observable<any> {
        return this.http.delete('/dishes/' + id);
    }
}