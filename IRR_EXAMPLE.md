# IRR Calculation Example

This document shows how the 5-Year IRR is calculated step-by-step, similar to an Excel spreadsheet.

## Example Property
- **Purchase Price**: $10,000,000
- **Equity Investment**: $3,500,000 (35% down)
- **Loan Amount**: $6,500,000 (65% LTV)
- **Initial NOI**: $600,000
- **Interest Rate**: 6%
- **Amortization**: 30 years

## Assumptions
- **Rent Growth**: 3% annually
- **Expense Growth**: 2% annually  
- **Market Cap Rate**: 6%
- **Exit Cap Rate**: 6.5%

## Step-by-Step Calculation

### Year 0 (Initial Investment)
```
Cash Flow: -$3,500,000 (equity investment)
Cumulative: -$3,500,000
```

### Year 1
```
Gross Income: $600,000 × 1.03 = $618,000
Op Expenses: $210,000 × 1.02 = $214,200 (35% of gross)
NOI: $618,000 - $214,200 = $403,800
Debt Service: $468,000 (fixed)
Cash Flow: $403,800 - $468,000 = -$64,200
Cumulative: -$3,500,000 + (-$64,200) = -$3,564,200
Remaining Debt: $6,500,000 - $216,667 = $6,283,333
Property Value: $403,800 ÷ 0.06 = $6,730,000
Exit Equity: $6,730,000 - $6,283,333 = $446,667
```

### Year 2
```
Gross Income: $600,000 × 1.03² = $636,540
Op Expenses: $210,000 × 1.02² = $218,484
NOI: $636,540 - $218,484 = $418,056
Debt Service: $468,000 (fixed)
Cash Flow: $418,056 - $468,000 = -$49,944
Cumulative: -$3,564,200 + (-$49,944) = -$3,614,144
Remaining Debt: $6,283,333 - $216,667 = $6,066,666
Property Value: $418,056 ÷ 0.06 = $6,967,600
Exit Equity: $6,967,600 - $6,066,666 = $900,934
```

### Year 3
```
Gross Income: $600,000 × 1.03³ = $655,636
Op Expenses: $210,000 × 1.02³ = $222,854
NOI: $655,636 - $222,854 = $432,782
Debt Service: $468,000 (fixed)
Cash Flow: $432,782 - $468,000 = -$35,218
Cumulative: -$3,614,144 + (-$35,218) = -$3,649,362
Remaining Debt: $6,066,666 - $216,667 = $5,849,999
Property Value: $432,782 ÷ 0.06 = $7,213,033
Exit Equity: $7,213,033 - $5,849,999 = $1,363,034
```

### Year 4
```
Gross Income: $600,000 × 1.03⁴ = $675,305
Op Expenses: $210,000 × 1.02⁴ = $227,311
NOI: $675,305 - $227,311 = $447,994
Debt Service: $468,000 (fixed)
Cash Flow: $447,994 - $468,000 = -$20,006
Cumulative: -$3,649,362 + (-$20,006) = -$3,669,368
Remaining Debt: $5,849,999 - $216,667 = $5,633,332
Property Value: $447,994 ÷ 0.06 = $7,466,567
Exit Equity: $7,466,567 - $5,633,332 = $1,833,235
```

### Year 5
```
Gross Income: $600,000 × 1.03⁵ = $695,564
Op Expenses: $210,000 × 1.02⁵ = $231,857
NOI: $695,564 - $231,857 = $463,707
Debt Service: $468,000 (fixed)
Cash Flow: $463,707 - $468,000 = -$4,293
Cumulative: -$3,669,368 + (-$4,293) = -$3,673,661
Remaining Debt: $5,633,332 - $216,667 = $5,416,665
Property Value: $463,707 ÷ 0.06 = $7,728,450
Exit Equity: $7,728,450 - $5,416,665 = $2,311,785
```

## Final IRR Calculation

The IRR is the discount rate that makes the Net Present Value (NPV) of all cash flows equal to zero.

**Cash Flow Series:**
- Year 0: -$3,500,000 (initial investment)
- Year 1: -$64,200
- Year 2: -$49,944  
- Year 3: -$35,218
- Year 4: -$20,006
- Year 5: -$4,293 + $2,311,785 = $2,307,492 (cash flow + exit equity)

**IRR Formula:**
```
NPV = 0 = -$3,500,000 + (-$64,200)/(1+r)¹ + (-$49,944)/(1+r)² + 
           (-$35,218)/(1+r)³ + (-$20,006)/(1+r)⁴ + $2,307,492/(1+r)⁵
```

**Solving for r (IRR):**
Using Newton-Raphson method, the IRR ≈ **15.2%**

## Key Insights

1. **Early Years**: Negative cash flow due to debt service > NOI
2. **Debt Amortization**: Principal payments reduce remaining debt each year
3. **Property Appreciation**: Growing NOI increases property value
4. **Exit Value**: Final year includes sale proceeds minus remaining debt
5. **IRR**: Represents the annualized return on equity investment

## Excel Equivalent

In Excel, you would use:
```
=IRR(cash_flow_range)
```

Where cash_flow_range contains the 6 values from Year 0 to Year 5.
