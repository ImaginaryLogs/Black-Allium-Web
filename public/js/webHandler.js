console.log("Script Loaded.");

// Get the elements
var navbar = document.getElementById("navbar");
var navButtons = navbar.getElementsByTagName("a");
var navbarYLocation = navbar.offsetTop;

var buttons = document.getElementsByClassName("pressable");

var clickSound = new Audio("../sounds/buttonClick.mp3");
var colors = document.querySelector(':root');
var isDarkMode = true;

var screen = document.getElementById("List");

/**
 * Minor Stuff Here
 */

function stickyDetection() {
    if (window.scrollY >= navbarYLocation) {
        console.log("Below!");
        navbar.classList.add("sticky")
    } else {
        navbar.classList.remove("sticky");
    }
}



window.addEventListener('load', async () => {
    const response = await fetch('/app/loadSettings');
    const data = await response.json()
    console.log("Loaded");
    console.log(data);
    colors.style.setProperty("--bg", data.web["--bg"]);
    colors.style.setProperty("--text", data.web["--text"]);
    colors.style.getPropertyValue("--bg");
})

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
    var docProperties = getComputedStyle(colors);
    var colorObj = {
        "web" : {
            "--bg": docProperties.getPropertyValue('--bg'),
        "--text": docProperties.getPropertyValue('--text')
        }
    }
    console.log(colorObj);
    fetch('/app/saveSettings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(colorObj)
    })
    
}

var bTheme = document.getElementById("bTheme");

if (bTheme != null) {
    bTheme.onclick = themeChange;
}

for (let i = 0; i <buttons.length; i++)
{
    let button = buttons[i];
    console.log(button);
    button.addEventListener("click", bClick);
}

window.onscroll = function(){stickyDetection()};

async function bAuthenticate() {
    const response = await fetch('/app/listEvents');
    const data = await response.json();
    console.log("Events", data.events)
    for (var i = 0; i < Object.keys(data.events).length; i++){
        console.log(`${data.events[i]["item"]}) ${data.events[i]["date"]} is ${data.events[i]["event"]}`);
        screen.innerHTML = `${Number(data.events[i]["item"]) + 1}) ${data.events[i]["date"]} is ${data.events[i]["event"]}`
    }
    if (data.events == null)
    {
        screen.innerHTML = `None`;
    }
    
}

async function bMark(){

}

var bList = document.getElementById("bList");

if (bList != null){
    bList.onclick = bAuthenticate;
}