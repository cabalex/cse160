const COMMENTS = {
  raw: [
    "Did you even cook this? It's still cold!",
    "Wow, this is still raw! I can't eat this.",
    "You know, you have a stove for a reason...?",
    "Are you trying to give me food poisoning? Do it again!",
  ],
  rare: [
    "This is undercooked. It needs more time on the heat.",
    "It's a bit raw. Maybe try flipping it over?",
  ],
  medium_rare: [
    "It's okay... but could use a bit more cooking.",
    "You might need a bit more spin in your cooking technique.",
    "This is almost there, but still a bit undercooked.",
  ],
  medium: [
    "This is cooked well enough, I guess.",
    "It's good, but a little dry. Needs more seasoning.",
  ],
  medium_well: [
    "This is cooked well, but it's a bit dry.",
    "It's almost perfect, but a bit overcooked.",
  ],
  burnt: [
    "This is burnt! I can't eat this.",
    "You ruined it! It's completely burnt.",
  ],
  almost_perfect: [
    "This is perfectly cooked! Great job!",
    "Wow, this is amazing! Perfectly cooked.",
    "This is the most amazing steak I've ever had!",
    "Compliments to the chef! I will be back for more.",
  ],
  perfect: [
    "You have mastered the art of cubic steak. We have no more lessons to teach you.",
  ],
  hotandcold: [
    "This is inconsistent! Some parts are cold, others are burnt.",
    "This is a disaster! It's hot and cold at the same time.",
    "If I wanted to eat something like this, I'd microwave a Hot Pocket!",
  ],
  seared: [
    "Hmm... one side is seared, but the rest is undercooked.",
    "I took one bite and I got a mouthful of cold meat... not good.",
    "Try more evenly cooking the steak next time.",
  ],
};
const TITLES = {
  seared: "Seared",
  hotandcold: "Icy Inferno",
  raw: "Raw",
  rare: "Rare",
  medium_rare: "Medium Rare",
  medium: "Medium",
  medium_well: "Medium Well",
  burnt: "Burnt",
  almost_perfect: "Perfectly Cooked",
  perfect: "The Steak to End All Steaks",
};

function getScore(cooked, ideal) {
  const total = cooked.reduce((sum, value) => sum + value, 0);
  const idealTotal = cooked.reduce((sum) => sum + ideal, 0);
  const average = total / cooked.length;
  const median = [...cooked].sort((a, b) => a - b)[
    Math.floor(cooked.length / 2)
  ];
  const progress = total / idealTotal;
  console.log(
    `Total: ${total}, Ideal Total: ${idealTotal}, Average: ${average}, Median: ${median}, Progress: ${progress}`
  );

  if (Math.abs(average - median) > 100) {
    return "hotandcold";
  }
  if (Math.abs(average - median) > 50) {
    return "seared";
  }

  const min = Math.min(...cooked);
  const max = Math.max(...cooked);
  if (Math.abs(progress - 1) < 0.05 && Math.abs(min - max) < 10) {
    return "perfect";
  } else if (Math.abs(progress - 1) < 0.1 && Math.abs(min - max) < 20) {
    return "almost_perfect";
  } else if (average < ideal * 0.2) {
    return "raw";
  } else if (average < ideal * 0.5) {
    return "rare";
  } else if (average < ideal * 0.8) {
    return "medium_rare";
  } else if (average < ideal * 1.2) {
    return "medium";
  } else if (average < ideal * 1.5) {
    return "medium_well";
  } else {
    return "burnt";
  }
}

function getSellingPrice(cooked, ideal) {
  const total = cooked.reduce((sum, value) => sum + value, 0);
  const idealTotal = cooked.reduce((sum) => sum + ideal, 0);

  const quality = Math.max(0, 1 - Math.abs(1 - total / idealTotal));

  const min = Math.min(...cooked);
  const max = Math.max(...cooked);
  let consistency = Math.max(0, 1 - Math.abs(max - min) / 100);
  if (quality < 0.5) {
    consistency *= 0.25; // If quality is low, reduce consistency impact
  }

  const overall = quality * 0.8 + consistency * 0.2;
  let price = overall * 100;

  if (quality < 0.2) price = 0;

  return price;
}

function checkHighScore(price) {
  const highScore = localStorage.getItem("cube-highScore") ?? 0;
  if (price > highScore) {
    localStorage.setItem("cube-highScore", price);
    return true;
  }
}

let resultsTimeout = null;
const cube = document.getElementById("cube");
const results = document.getElementById("results");
const resultBody = document.getElementById("result-body");
const resultTitle = document.getElementById("result-title");
const resultScore = document.getElementById("result-score");
const highScore = document.getElementById("high-score-value");
highScore.innerText =
  "$" + parseFloat(localStorage.getItem("cube-highScore") ?? "0").toFixed(2);
export default function showResults(
  cooked,
  ideal,
  canvases,
  windowBonus = false
) {
  if (resultsTimeout) {
    clearTimeout(resultsTimeout);
    resultsTimeout = null;
    results.style.display = "none";
  }

  if (cube.children.length > 0) cube.innerHTML = "";
  for (const ctx of canvases) {
    const img = document.createElement("img");
    img.src = ctx.canvas.toDataURL();
    img.width = 200;
    img.height = 200;
    cube.appendChild(img);
  }
  results.style.display = "flex";

  const score = getScore(cooked, ideal);
  console.log(score);
  resultTitle.innerText = TITLES[score];
  resultBody.innerText =
    COMMENTS[score]?.[Math.floor(Math.random() * COMMENTS[score].length)] ||
    "Well done!";
  let price = getSellingPrice(cooked, ideal);
  if (windowBonus && price > 0) {
    price *= 1.5; // Bonus for cooking near the window
    resultBody.innerText += " \nOUT THE WINDOW! +50% bonus!";
  }
  resultScore.innerText = "$" + price.toFixed(2);
  if (checkHighScore(price)) {
    highScore.innerText =
      "$" +
      parseFloat(localStorage.getItem("cube-highScore") ?? "0").toFixed(2);
    resultBody.innerText += " New high score!";
  }

  resultsTimeout = setTimeout(() => {
    results.style.display = "none";
    cube.innerHTML = "";
  }, 5000);
}
