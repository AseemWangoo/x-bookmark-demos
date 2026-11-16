import { formSpecSchema, type FormId, type FormSpec } from "../adapter/types"

export const TEMPLATE_MODE_LABEL =
  "Template mode — recorded form layouts, no model calls."

export const SEED_PROMPT = "booking form with date picker, guest count and room type"

export const RECORDED_PROMPTS: { id: FormId; label: string; prompt: string }[] = [
  { id: "booking", label: "Booking", prompt: SEED_PROMPT },
  {
    id: "contact",
    label: "Contact",
    prompt: "contact form with name, email and topic",
  },
  {
    id: "destination",
    label: "Destination",
    prompt: "searchable destination form with a combobox",
  },
]

const ROOMS = [
  { value: "standard", label: "Standard" },
  { value: "deluxe", label: "Deluxe" },
  { value: "suite", label: "Suite" },
]

const TOPICS = [
  { value: "booking", label: "Booking question" },
  { value: "support", label: "Support" },
  { value: "press", label: "Press" },
]

const CITIES = [
  { value: "kyoto", label: "Kyoto" },
  { value: "lisbon", label: "Lisbon" },
  { value: "mexico-city", label: "Mexico City" },
  { value: "reykjavik", label: "Reykjavik" },
]

function note(fallback: boolean): string {
  if (!fallback) return TEMPLATE_MODE_LABEL
  return `No recorded template matched this prompt. Showing the booking form. ${TEMPLATE_MODE_LABEL}`
}

function bookingSpec(fallback: boolean): FormSpec {
  return {
    id: "booking",
    title: "Booking",
    description: "Stay date, guest count, and room type.",
    submitLabel: "Request booking",
    fallback,
    matchNote: note(fallback),
    fields: [
      {
        kind: "text",
        name: "guestName",
        label: "Guest name",
        description: "The name on the reservation.",
        inputType: "text",
        autoComplete: "name",
        placeholder: "Ada Lovelace",
      },
      {
        kind: "date",
        name: "stay",
        label: "Stay",
        description: "Type a date or pick one from the calendar.",
        mode: "range",
        required: true,
        startLabel: "Check in",
        endLabel: "Check out",
        startName: "checkIn",
        endName: "checkOut",
      },
      {
        kind: "number",
        name: "guests",
        label: "Guests",
        description: "At least 1. Arrow keys step the count.",
        min: 1,
        required: true,
        defaultValue: 1,
      },
      {
        kind: "select",
        name: "roomType",
        label: "Room type",
        description: "Standard, Deluxe, or Suite.",
        placeholder: "Choose a room",
        required: true,
        items: ROOMS,
      },
    ],
  }
}

function contactSpec(): FormSpec {
  return {
    id: "contact",
    title: "Contact",
    description: "Name, email, topic, and a short message.",
    submitLabel: "Send message",
    fallback: false,
    matchNote: note(false),
    fields: [
      {
        kind: "text",
        name: "name",
        label: "Name",
        inputType: "text",
        autoComplete: "name",
        required: true,
        placeholder: "Ada Lovelace",
      },
      {
        kind: "text",
        name: "email",
        label: "Email",
        inputType: "email",
        autoComplete: "email",
        required: true,
        placeholder: "ada@example.com",
      },
      {
        kind: "select",
        name: "topic",
        label: "Topic",
        placeholder: "Choose a topic",
        required: true,
        items: TOPICS,
      },
      {
        kind: "textarea",
        name: "message",
        label: "Message",
        placeholder: "How can we help?",
      },
    ],
  }
}

function destinationSpec(): FormSpec {
  return {
    id: "destination",
    title: "Trip search",
    description: "A searchable city, plus who is traveling and when.",
    submitLabel: "Save trip",
    fallback: false,
    matchNote: note(false),
    fields: [
      {
        kind: "text",
        name: "traveler",
        label: "Traveler",
        inputType: "text",
        autoComplete: "name",
        required: true,
        placeholder: "Ada Lovelace",
      },
      {
        kind: "combobox",
        name: "destination",
        label: "Destination",
        description: "Type to filter the city list.",
        placeholder: "Search cities",
        required: true,
        items: CITIES,
      },
      {
        kind: "date",
        name: "departure",
        label: "Departure",
        mode: "single",
        required: true,
        startLabel: "Departure date",
      },
    ],
  }
}

export function matchTemplate(prompt: string): FormSpec {
  const text = prompt.trim().toLowerCase()
  let spec: FormSpec
  if (text.includes("contact") || (text.includes("email") && text.includes("name"))) {
    spec = contactSpec()
  } else if (
    text.includes("combobox") ||
    text.includes("destination") ||
    text.includes("searchable")
  ) {
    spec = destinationSpec()
  } else if (
    text.includes("booking") ||
    text.includes("guest") ||
    text.includes("room type") ||
    text.includes("date picker")
  ) {
    spec = bookingSpec(false)
  } else {
    spec = bookingSpec(true)
  }
  return formSpecSchema.parse(spec)
}
