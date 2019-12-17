let star1 = document.getElementById('star1');
let star2 = document.getElementById('star2');
let star3 = document.getElementById('star3');
let star4 = document.getElementById('star4');
let star5 = document.getElementById('star5');
let stars = [star1, star2, star3, star4, star5];

let locked = false;

for(const star of stars){
  star.addEventListener("mouseover", gold);
  star.addEventListener("mouseout", gray);
  star.addEventListener("mouseup", lock);
}

function gold(){
  console.log("hover, id = "+this.id);
  switch(this.id){
    case "star5":
      star5.src = "/images/star_gold.png";
    case "star4":
      star4.src = "/images/star_gold.png";
    case "star3":
      star3.src = "/images/star_gold.png";
    case "star2":
      star2.src = "/images/star_gold.png";
    case "star1":
      star1.src = "/images/star_gold.png";
  }
//  x.src = "/images/star_gold.png";
}
function gray(){
  switch(this.id){
    case "star5":
      star5.src = "/images/star_gray.png";
    case "star4":
      star4.src = "/images/star_gray.png";
    case "star3":
      star3.src = "/images/star_gray.png";
    case "star2":
      star2.src = "/images/star_gray.png";
    case "star1":
      star1.src = "/images/star_gray.png";
  }
}

function lock(){
  console.log("clicked by "+this.id)
  if(locked == false){
    for(const star of stars){
      console.log("removing")
      star.removeEventListener("mouseover", gold);
      star.removeEventListener("mouseout", gray);
    }
    locked = true;
  } else {
    for(const star of stars) {
      console.log("adding")
      star.addEventListener("mouseover", gold);
      star.addEventListener("mouseout", gray);
    }
    locked = false;
  }
}
