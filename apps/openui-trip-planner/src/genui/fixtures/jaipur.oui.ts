export const jaipurOpenUI = `root = TripPlan("Jaipur in 2 days", [card, days, budget, book])
card = ItineraryCard("Jaipur", 2, "Amer at sunrise, the Pink City palaces, and a hill-fort evening, with one haveli night near the old city.", ["Amber Fort", "Hawa Mahal", "City Palace", "Johari Bazaar", "Nahargarh"])
days = DayTable([row1, row2, row3, row4, row5, row6, row7, row8])
row1 = {day: "Day 1", time: "08:30", activity: "Amber Fort", area: "Amer", cost: 500}
row2 = {day: "Day 1", time: "13:00", activity: "City Palace", area: "Old City", cost: 700}
row3 = {day: "Day 1", time: "16:00", activity: "Hawa Mahal", area: "Badi Chaupar", cost: 200}
row4 = {day: "Day 1", time: "19:30", activity: "Johari Bazaar dinner", area: "Johari Bazaar", cost: 900}
row5 = {day: "Day 2", time: "07:00", activity: "Nahargarh sunrise", area: "Nahargarh", cost: 200}
row6 = {day: "Day 2", time: "10:30", activity: "Jantar Mantar", area: "Old City", cost: 200}
row7 = {day: "Day 2", time: "13:30", activity: "Albert Hall Museum", area: "Ram Niwas", cost: 300}
row8 = {day: "Day 2", time: "17:00", activity: "Bapu Bazaar and rooftop", area: "C Scheme", cost: 800}
budget = BudgetChart([stay, food, sights, transport, shopping], "INR")
stay = {category: "Stay", amount: 6500}
food = {category: "Food", amount: 4200}
sights = {category: "Sights", amount: 2100}
transport = {category: "Transport", amount: 2500}
shopping = {category: "Shopping", amount: 3200}
book = BookButton("Book this trip", @BookTrip("Jaipur", 2, 18500))
`;
