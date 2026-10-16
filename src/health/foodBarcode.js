/** GS1 barcode check digit, for common food EAN/UPC/GTIN codes. */
export function validFoodBarcode(input) {
  const code=String(input||'');
  if(!/^\d{8,14}$/.test(code))return false;
  if(![8,12,13,14].includes(code.length))return false;
  const digits=code.split('').map(Number);
  const expected=digits.pop();
  let sum=0;
  for(let i=digits.length-1,weight=3;i>=0;i--,weight=weight===3?1:3)sum+=digits[i]*weight;
  return (10-sum%10)%10===expected;
}
