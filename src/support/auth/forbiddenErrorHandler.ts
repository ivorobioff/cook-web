import { Observable } from "rxjs";
import { HttpError, HttpResponseError } from "../http/HttpCommunicator";
import defaultErrorHandler from "../http/defaultErrorHandler";
import { Authenticator } from "./Authenticator";

export default function forbiddenErrorHandler(authenticator: Authenticator): (error: HttpError) => Observable<any> {
    
    return (error: HttpError) => {

        if (error instanceof HttpResponseError) {
            let responseError = error as HttpResponseError;

            if (responseError.status === 403) {
                return new Observable(observer => {
                    observer.error('Forbidden');
                    authenticator.logout();
                });
            }
        }

        return defaultErrorHandler(error)
    }
}