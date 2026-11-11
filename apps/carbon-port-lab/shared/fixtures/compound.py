def compound(principal, rate, years, n=12):
    return principal * (1 + rate / n) ** (n * years)

principal = float(input("principal: "))
rate = float(input("annual rate (0.05 = 5%): "))
years = int(input("years: "))
print(round(compound(principal, rate, years), 2))
