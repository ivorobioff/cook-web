import { Observable } from "rxjs";
import HttpCommunicator from "../../support/http/HttpCommunicator";
import Container from "../../support/ioc/Container";
import Ingredient, { IngredientToPersist } from "../models/Ingredient";

export default class IngredientService {
    private http: HttpCommunicator;

    constructor(container: Container) {
        this.http = container.get('https');
    }

    getAll(offset: number, limit: number): Observable<Ingredient[]> {
        return this.http.get('/ingredients', { offset, limit });
    }

    getAllLightweight(): Observable<Ingredient[]> {
        return this.http.get('/lightweight-ingredients');
    }
    
    create(ingredient: IngredientToPersist): Observable<Ingredient> {
        return this.http.post('/ingredients', ingredient);
    }

    update(id: string, ingredient: IngredientToPersist): Observable<any> {
        return this.http.patch('/ingredients/' + id, ingredient);
    }

    remove(id: string): Observable<any> {
        return this.http.delete('/ingredients/' + id);
    }
}