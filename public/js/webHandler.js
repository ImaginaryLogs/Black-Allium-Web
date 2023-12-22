console.log("Script Loaded.");

// Get the elements
var navbar = document.getElementById("navbar");
var navbarYLocation = navbar.offsetTop;

var buttons = document.getElementsByClassName("pressable");

var clickSound = new Audio("../sounds/buttonClick.mp3");
var colors = document.querySelector(':root');
var isDarkMode = true;


/**
 * Minor Stuff Here
 */

function stickyDetection() {
    if (window.scrollY >= navbarYLocation) {
        navbar.classList.add("sticky")
    } else {
        navbar.classList.remove("sticky");
    }
}

function bClick() {
    clickSound.play();
    console.log("Click!");
}

function themeChange(){
    if (isDarkMode){
        colors.style.setProperty('--bg', 'white');
        colors.style.setProperty('--text','#080808');
        isDarkMode = false;
    }
    else{
        colors.style.setProperty('--bg', '#080808');
        colors.style.setProperty('--text','white');
        isDarkMode = true;
    }
    
}
document.getElementById("bTheme").onclick = themeChange;

for (let i = 0; i <buttons.length; i++)
{
    let button = buttons[i];
    console.log(button);
    button.addEventListener("click", bClick);
}

window.onscroll = function(){stickyDetection()};

/**
 * API Stuff Here
*/

async function bAuthenticate() {
    fetch('/app/listEvents');
}
document.getElementById("bList").onclick = bAuthenticate;