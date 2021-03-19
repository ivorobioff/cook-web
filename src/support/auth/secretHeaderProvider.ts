import { HttpRequestOptionsProvider } from "../http/HttpCommunicator";
import { Authenticator } from "./Authenticator";

export default function secretHeaderProvider(authenticator: Authenticator): HttpRequestOptionsProvider {
    return () => {
        let session = authenticator.session;

        return session ? {
            headers: {'Secret-Token': session.secret }
        } : {};
    };
}