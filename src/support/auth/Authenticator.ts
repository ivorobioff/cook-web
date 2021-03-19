import {Observable} from "rxjs";
import Session from "./Session";
import HttpCommunicator from "../http/HttpCommunicator";
import Container from "../ioc/Container";
import moment from "moment";
import { retry, finalize } from "rxjs/operators";
import { peek } from "../mapping/operators";
import { History } from "history";

const storage = localStorage;

function isExpired(session: Session): boolean {
    return moment.utc(session.expiresAt).isSameOrBefore(moment.utc());
}

function willExpire(session: Session): boolean {
    return moment.utc(session.expiresAt)
        .subtract(10, 'minutes')
        .isSameOrBefore(moment.utc());
}

function destroy() {
    storage.removeItem('session');
}

function persist(session: Session) {
    storage.setItem('session', JSON.stringify(session));
}

function retrieve(): Session|null {
    let plain = storage.getItem('session');

    if (!plain) {
        return null;
    }

    return JSON.parse(plain);
}

export class Authenticator {

    private http: HttpCommunicator;
    private history: History;

    constructor(container: Container) {
        this.http = container.get('http');
        this.history = container.get('history');
    }

    login(username: string, password: string, remember: boolean): Observable<any> {
        return this.http.post<Session>('/auth/login', {
            username,
            password,
            remember
        }).pipe(
            peek(persist, 'before')
        );
    }

    logout() {
        let session = retrieve();

        if (session) {
            this.http.post('/auth/logout', { secret:session.secret }).subscribe(() => {
                //
            });
        }

        destroy();

        this.history.replace('/sign-in');
    }

    get session(): Session|null {
        let session = retrieve();

        if(!session || isExpired(session)){
            return null;
        }

        return session;
    }


    watch() {
        new Observable<(() => void)>(observer => {
            let execute = () => {
                setTimeout(() => {
                    let session = this.session;
                                        
                    if (session && willExpire(session)) {
                        this.http.post<Session>('/auth/refresh', { secret: session.secret }).pipe(
                            retry(3),
                            finalize(() => observer.next(execute))
                        ).subscribe(persist, () => this.logout());
                    } else {
                        observer.next(execute);
                    }

                }, 60000); // 1 minute
            }

            observer.next(execute);
        }).subscribe(execute => execute());
    }
}