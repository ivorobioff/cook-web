import Dish from "./Dish";

export default interface Schedule {
    id: string;
    dishId: string;
    dish: Dish;
    scheduledOn: string;
}

export interface ScheduleToPersist {
    dishId: string;
    scheduledOn: string;
}

export interface Waste {
    ingredient: string;
    quantity: string;
}

export interface FinishedSchedule {
    notes: string;
    wastes: Waste[];
}