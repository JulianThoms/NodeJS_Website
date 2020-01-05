const starsArr = [document.getElementById('star1'), document.getElementById('star2'), document.getElementById('star3'), document.getElementById('star4'), document.getElementById('star5')];
let rating_input = document.getElementById('rating_input');
let score = 0;

let locked = false;


for (const star of starsArr) {
  star.addEventListener("mouseover", gold);
  star.addEventListener("mouseout", gray);
  star.addEventListener("mouseup", lock);
}


function gold() {
  switch (this.id) {
    case "star5":
      starsArr[4].src = "/images/star_gold.png";
    case "star4":
      starsArr[3].src = "/images/star_gold.png";
    case "star3":
      starsArr[2].src = "/images/star_gold.png";
    case "star2":
      starsArr[1].src = "/images/star_gold.png";
    case "star1":
      starsArr[0].src = "/images/star_gold.png";
  }

}

function gray() {
  switch (this.id) {
    case "star5":
      starsArr[4].src = "/images/star_gray.png";
    case "star4":
      starsArr[3].src = "/images/star_gray.png";
    case "star3":
      starsArr[2].src = "/images/star_gray.png";
    case "star2":
      starsArr[1].src = "/images/star_gray.png";
    case "star1":
      starsArr[0].src = "/images/star_gray.png";
  }
}

function lock() {
  switch (this.id) {
    case "star5":
      score = 5;
      break;
    case "star4":
      score = 4;
      break;
    case "star3":
      score = 3;
      break;
    case "star2":
      score = 2;
      break;
    case "star1":
      score = 1;
      break;
  }
  if (locked == false) {
    for (const star of starsArr) {
      star.removeEventListener("mouseover", gold);
      star.removeEventListener("mouseout", gray);
    }
    locked = true;
  } else {
    for (const star of starsArr) {
      star.addEventListener("mouseover", gold);
      star.addEventListener("mouseout", gray);
    }
    locked = false;
  }
  rating_input.value = score;
}
