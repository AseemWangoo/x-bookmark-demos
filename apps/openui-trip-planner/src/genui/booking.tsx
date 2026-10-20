import { createContext, useContext } from "react";

export type BookingApi = {
  booked: boolean;
};

export const BookingContext = createContext<BookingApi>({ booked: false });

export function useBooking(): BookingApi {
  return useContext(BookingContext);
}
