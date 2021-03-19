export interface Actor {
    id: string;
    name: string;
}

export default interface Session {
    id: string;
    secret: string;
    expiresAt: string;
    actor: Actor;
}