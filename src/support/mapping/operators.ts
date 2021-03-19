import { Observable, Subscriber } from "rxjs";

export function peek<T>(action: (value: T) => void, position: 'before' | 'after'): (origin: Observable<T>) => Observable<T> {
    return (origin: Observable<T>) => new Observable<T>(observer => {
        origin.subscribe({
            next(value) {

                if (position === 'before') {
                    action(value);
                }

                observer.next(value);
                
                if (position === 'after') {
                    action(value);
                }
            },
            error(e) {
                observer.error(e);
            },
            complete() {
                observer.complete();
            }
        });
    });
}

export function singleton<T>(executor: (done: (value?: T) => void, reject: (reason: any) => void) => void): Observable<T> {
    
    let done = (subscriber: Subscriber<T>) => {
        return (value?: T) => {
            subscriber.next(value);
            subscriber.complete();
        };
    }

    let reject = (subscriber: Subscriber<T>) => {
        return (reason: any) => {
            subscriber.error(reason);
        }
    }

    return new Observable<T>(subscriber => {
        executor(done(subscriber), reject(subscriber));
    });
}