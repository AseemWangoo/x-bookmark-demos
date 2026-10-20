import { BudgetChartView } from "@/genui/components/budget-chart.tsx";
import { BookButtonView } from "@/genui/components/book-button.tsx";
import { DayTableView } from "@/genui/components/day-table.tsx";
import { ItineraryCardView } from "@/genui/components/itinerary-card.tsx";
import { TripPlanView } from "@/genui/components/trip-plan.tsx";
import {
  action,
  createLibrary,
  defineAction,
  defineComponent,
  tagSchemaId,
} from "@openuidev/react-lang";
import { z } from "zod/v4";

const DayRow = z.object({
  day: z.string(),
  time: z.string(),
  activity: z.string(),
  area: z.string(),
  cost: z.number(),
});
tagSchemaId(DayRow, "DayRow");

const BudgetItem = z.object({
  category: z.string(),
  amount: z.number(),
});
tagSchemaId(BudgetItem, "BudgetItem");

const ItineraryCard = defineComponent({
  name: "ItineraryCard",
  description:
    "Headline card with the city, trip length, a one-line summary, and highlight badges.",
  props: z.object({
    city: z.string(),
    days: z.number(),
    summary: z.string(),
    highlights: z.array(z.string()),
  }),
  component: ItineraryCardView,
});

const DayTable = defineComponent({
  name: "DayTable",
  description:
    "Day-by-day schedule. Each row is {day, time, activity, area, cost}.",
  props: z.object({
    rows: z.array(DayRow),
  }),
  component: DayTableView,
});

const BudgetChart = defineComponent({
  name: "BudgetChart",
  description:
    "Bar chart of budget categories. items are {category, amount}. currency is an ISO code such as INR.",
  props: z.object({
    items: z.array(BudgetItem),
    currency: z.string(),
  }),
  component: BudgetChartView,
});

export const bookTrip = defineAction({
  name: "BookTrip",
  description:
    "Mock-books the trip in the host app. No payment is taken. Arguments are city, days, and total.",
  params: z.object({
    city: z.string(),
    days: z.number(),
    total: z.number(),
  }),
});

const BookButton = defineComponent({
  name: "BookButton",
  description:
    'Books the trip. Write BookButton("Book this trip", @BookTrip(city, days, total)).',
  props: z.object({
    label: z.string(),
    action: action(),
  }),
  component: BookButtonView,
});

const TripPlan = defineComponent({
  name: "TripPlan",
  description:
    "Root layout. children order is ItineraryCard, DayTable, BudgetChart, BookButton.",
  props: z.object({
    title: z.string(),
    children: z.array(
      z.union([
        ItineraryCard.ref,
        DayTable.ref,
        BudgetChart.ref,
        BookButton.ref,
      ]),
    ),
  }),
  component: TripPlanView,
});

export const library = createLibrary({
  root: "TripPlan",
  components: [TripPlan, ItineraryCard, DayTable, BudgetChart, BookButton],
  actions: [bookTrip],
  componentGroups: [
    {
      name: "Trip",
      components: [
        "TripPlan",
        "ItineraryCard",
        "DayTable",
        "BudgetChart",
        "BookButton",
      ],
      notes: [
        "- Every program starts with root = TripPlan(title, [itinerary, days, budget, book]).",
        "- Define each child as its own statement so the UI can stream in.",
        "- DayTable rows and BudgetChart items are object statements referenced by the parent.",
        '- Book with book = BookButton("Book this trip", @BookTrip(city, days, total)).',
        "- total must equal the sum of the budget amounts. No Query or Mutation.",
      ],
    },
  ],
});
