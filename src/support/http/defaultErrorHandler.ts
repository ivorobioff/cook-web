import { HttpError, HttpResponseError, HttpRequestError } from "./HttpCommunicator";
import { hasField } from "../random/utils";
import { Observable, throwError} from "rxjs";

function transformResponseError(error: HttpResponseError) {
    const { status, data } = error;

    if (status === 422 && hasField(data, 'errors')) {
        return data.errors;
    }

    if (status === 400 && hasField(data, 'message')) {
        return data.message;
    }

    return 'Server responded with an unknown error!';
}

export default function defaultErrorHandler(error: HttpError): Observable<any> {
    
    if (error instanceof HttpResponseError) {
        return throwError(transformResponseError(error));
    }

    if (error instanceof HttpRequestError) {
        return throwError('Server cannot be reached due to unknown reasons!');
    }

    return throwError('Unknown error');
}