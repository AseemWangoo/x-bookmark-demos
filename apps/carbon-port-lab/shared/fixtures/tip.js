// tip.js — 2011. prompt() in, alert() out.
function tip(bill, percent, people) {
  var gratuity = bill * (percent / 100);
  var total = bill + gratuity;
  return { gratuity: gratuity, total: total, each: total / people };
}

var bill = Number(prompt("Bill?"));
var percent = Number(prompt("Tip percent?"));
var people = Number(prompt("People?"));
var result = tip(bill, percent, people);
alert(
  "Tip $" + result.gratuity.toFixed(2) +
  "\\nTotal $" + result.total.toFixed(2) +
  "\\nEach $" + result.each.toFixed(2)
);
