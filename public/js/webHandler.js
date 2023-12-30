console.log("Script Loaded.");


var clickSound = new Audio("../sounds/buttonClick.mp3");

var buttons = document.getElementsByClassName("pressable");
var docVariables = document.querySelector(':root');
var loadingBar = document.getElementById("statusPanel")?.getElementsByClassName("loading_bar");
var statusSign = document.getElementById("statusSign");
var statusMessage = statusSign?.getElementsByTagName("b");
var div_screen = document.getElementById("List");
var statusCircle = document.getElementById("circleStatus")
var inputMarkdownAddress = document.getElementById("bPathText");
var expandable_buttons = document.getElementsByClassName("expandable_button");

var isDarkMode = true;

// Get the elements



function stickyDetection() {
    var navbar = document.getElementById("navbar");
    var navButtons = navbar.getElementsByTagName("a");
    var navbarYPos = navbar.offsetTop;
    if (window.scrollY >= navbarYPos) {
        console.log("Below!");
        navbar.classList.add("sticky")
    } else {
        navbar.classList.remove("sticky");
    }
}

function LoadingBarStatus(status, message) {
    statusSign.innerHTML = '<b>Status:</b> ' + message ; 
    switch (status){
        case "failure":
            loadingBar[0].classList.add("hidden")
            statusMessage[0].style.setProperty("color", "red");
            break;
        case "fetch":
            loadingBar[0].classList.remove("hidden");
            statusMessage[0].style.setProperty("color", "yellow");
            break;
        case "idle":
        case "ok":
        default:
            loadingBar[0].classList.add("hidden")
            statusMessage[0].style.setProperty("color", "green");
            break;
    } 
}

async function idleStatus(){
    setTimeout(()=>{
        LoadingBarStatus("green", "Idle");
    }, 2000)
}

// Buttons functions
function bClick() {
    clickSound.play();
    console.log("Click!");
}

function fTheme() {
    if (isDarkMode) {
        docVariables.style.setProperty('--bg', 'white');
        docVariables.style.setProperty('--text','#080808');
        isDarkMode = false;
    } else {
        docVariables.style.setProperty('--bg', '#080808');
        docVariables.style.setProperty('--text','white');
        isDarkMode = true;
    }
    var docProperties = getComputedStyle(docVariables);
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

async function fList() {
    LoadingBarStatus("fetch", "Fetching...")
    
    var data = {}
    await fetch('/app/listEvents').then(async (response) => {
        console.log("Success", data.events)
        data = await response.json();
        LoadingBarStatus("ok", "Idle");
        for (var i = 0; i < Object.keys(data.events).length; i++){
            console.log(`${data.events[i]["item"]}) ${data.events[i]["date"]} is ${data.events[i]["event"]}`);
            div_screen.innerHTML = `${Number(data.events[i]["item"]) + 1}) ${data.events[i]["date"]} is ${data.events[i]["event"]}`
        }
    }).catch((err)=>{
        data = {
            "events" : ""
        };
        LoadingBarStatus("failure", "No Events Detected");
    });

    if (data.events == "")
    {
        div_screen.innerHTML = `None`;
    }
    idleStatus();
}

async function fMdAddress() {
    LoadingBarStatus("fetch", "Fetching...")
    var markData = {
        "markdown_path": inputMarkdownAddress.value
    }
    if(confirm(`Do you want to save the following Data? Address:${markData["markdown_path"]}`)){  
        await fetch('/app/saveSettings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(markData)
        }).then((res, req)=>{
            LoadingBarStatus("ok", "Data saved");
        })
        .catch((err)=>{
            LoadingBarStatus("failure", "Data failed to be saved");;
            console.error(err);
        })
    } else {
        LoadingBarStatus("failure", "Data not submitted");
    }
    idleStatus();
}

async function fMdList() {
    LoadingBarStatus("fetch", "Fetching...")
    var innerString = "Tasks:\n"
    var data = {}
    
    
    await fetch('/app/mdList')
    .then(async (response) => {
        data = await response.json();
        console.log("Success", data["tasks"]);

        for (var i = 0; i < Object.keys(data["tasks"]).length; i++){
            console.log(` ${i.toString().padStart(2, '0')}) ${data["tasks"][i]}`);
            innerString += ` ${i.toString().padStart(2, '0')}) ${data["tasks"][i]}\n`
            div_screen.innerHTML = innerString;
        }
        LoadingBarStatus("ok", "Idle");
        console.log(data);
    }).catch((err)=>{
        data = {
            "events" : ""
        };
        LoadingBarStatus("failure", "No Events Detected in Markdown List");
    });

    if (data.events == "")
    {
        div_screen.innerHTML = `None`;
    }
    
    idleStatus();
}

async function fMdToGcEvents() {
    LoadingBarStatus("fetch", "Fetching...");

    await fetch('/app/MdToGcEvents')

    idleStatus();
}

var ctrlButtons = {
    "bTheme" : [fTheme, {}],
    "bList" : [fList, {}],
    "bPath" : [fMdAddress, {}],
    "bMdList" : [fMdList, {}],
    "bAddEvents" : [fMdToGcEvents, {}]
}

Object.entries(ctrlButtons).forEach(([buttonName, value]) => {
    value[1] = document.getElementById(buttonName);
    if (value[1] != null) {
        value[1].onclick = value[0];
    } 
})

for (var i = 0; i <buttons.length; i++)
{
    let button = buttons[i];
    console.log(button);
    button.addEventListener("click", bClick);
}

if (expandable_buttons)
{
    for (var i = 0; i < expandable_buttons.length; i++){
        expandable_buttons[i].addEventListener("click", function () {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                this.parentNode.classList.remove("active_panel");
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
                this.parentNode.classList.add("active_panel");
            }
            
        })
    }
}

window.onscroll = function(){stickyDetection()};

window.addEventListener('load', async () => {
    var response = {};

    await fetch('/app/loadSettings').then(async ()=>{
        response = await fetch('/app/loadSettings');
    })
    .catch(async (err)=>{
        await fTheme().then(async () => {
            response = await fetch('/app/loadSettings');
        })
    })
    const data = await response.json();
    console.log("Loaded");
    console.log(data);
    docVariables.style.setProperty("--bg", data.web["--bg"]);
    docVariables.style.setProperty("--text", data.web["--text"]);
    isDarkMode = data.web["--text"] == "white" ? true : false;
    docVariables.style.getPropertyValue("--bg");
    const loading_screen = document.getElementById("loading");
    if (loading_screen != null){
        loading_screen.classList.add("transparent")
        setTimeout(()=>{
            loading_screen.classList.add("hidden");
        }, 250)
    }
})