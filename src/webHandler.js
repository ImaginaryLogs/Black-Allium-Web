console.log("Script Loaded.");

// Get the navbar
var navbar = document.getElementById("navbar");
var buttons = document.getElementsByClassName("pressable");
var sticky = navbar.offsetTop;
var clickSound = new Audio("../sounds/buttonClick.mp3");
var colors = document.querySelector(':root');
var isDarkMode = true;

function stickyDetection() {
    if (window.scrollY >= sticky) {
        navbar.classList.add("sticky")
    } else {
        navbar.classList.remove("sticky");
    }
}

function buttonClick() {
    clickSound.play();
    console.log("Click!");
}

function themeChange(){
    if (isDarkMode)
    {
        colors.style.setProperty('--bg', 'white');
        colors.style.setProperty('--text','#080808');
        isDarkMode = false;
    }
    else
    {
        colors.style.setProperty('--bg', '#080808');
        colors.style.setProperty('--text','white');
        isDarkMode = true;
    }
    
}

for (let i = 0; i <buttons.length; i++)
{
    let button = buttons[i];
    console.log(button);
    button.addEventListener("click", buttonClick);
}

window.onscroll = function(){stickyDetection()};