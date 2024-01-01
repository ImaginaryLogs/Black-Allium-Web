console.log("Script Loaded.");

var cssProps = document.querySelector(':root');
var screenList = document.getElementById("screenList");
var isDarkMode = true;

function main(){
    const ctrlButtons = {
        "bTheme" : [bUpdateWebTheme, {}],
        "bList" : [bListGogleCal, {}],
        "bPath" : [bInputTaskFile, {}],
        "bMdList" : [bListMarkdown, {}],
        "bAddEvents" : [bEventsSync, {}]
    }
    Object.entries(ctrlButtons).forEach(([buttonName, value]) => {
        value[1] = document.getElementById(buttonName);
        if (value[1] != null) {
            value[1].onclick = value[0];
        } 
    })

    const buttonsValid = document.getElementsByClassName("pressable");
    const clickSound = new Audio("../sounds/buttonClick.mp3");
    for (const button of buttonsValid) {
        console.log(button);
        button.addEventListener("click", ()=>{clickSound.play()});
    }

    const buttonsExpandable = document.getElementsByClassName("expandable_button");
    if (buttonsExpandable) {
        for (const expandableButton of buttonsExpandable){
            expandableButton.addEventListener("click", function () {
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
        let response = {};
        await fetch('/api/settings/load')
        .then(async (res) => {
            console.log(res)
            response = await fetch('/api/settings/load');
        })
        .catch(async (err)=>{
            console.error(err);
            await bUpdateWebTheme()
            .then(async () => {
                response = await fetch('/api/settings/load');
            })
        })
        console.log(response)
        const data = await response.json();
        console.log("Loaded");
        console.log(data);
        cssProps.style.setProperty("--bg", data.web["--bg"]);
        cssProps.style.setProperty("--text", data.web["--text"]);
        isDarkMode = data.web["--text"] == "white" ? true : false;
        cssProps.style.getPropertyValue("--bg");
        const loading_screen = document.getElementById("loading");
        if (loading_screen != null){
            loading_screen.classList.add("transparent")
            setTimeout(()=>{
                loading_screen.classList.add("hidden");
            }, 250)
        }
    })  
}

function stickyDetection() {
    const navbar = document.getElementById("navbar");
    const navbarYPos = navbar.offsetTop;
    if (window.scrollY >= navbarYPos) {
        console.log("Below!");
        navbar.classList.add("sticky")
    } else {
        navbar.classList.remove("sticky");
    }
}

function LoadingBarStatus(status, message) {
    const loadingBar = document.getElementById("statusPanel")?.getElementsByClassName("loading_bar");
    const statusSign = document.getElementById("statusSign");
    const statusMessage = statusSign?.getElementsByTagName("b");
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
}}

async function idleStatus() {
    setTimeout(()=>{LoadingBarStatus("green", "Idle")}, 2000);
}

function bUpdateWebTheme() {
    if (isDarkMode) {
        cssProps.style.setProperty('--bg', 'white');
        cssProps.style.setProperty('--text','#080808');
        isDarkMode = false;
    } else {
        cssProps.style.setProperty('--bg', '#080808');
        cssProps.style.setProperty('--text','white');
        isDarkMode = true;
    }
    var docProperties = getComputedStyle(cssProps);
    var colorObj = {
        "web" : {
            "--bg": docProperties.getPropertyValue('--bg'),
            "--text": docProperties.getPropertyValue('--text')
        }
    }
    fetch('/api/settings/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(colorObj)
    })   
}

async function bListGogleCal() {
    LoadingBarStatus("fetch", "Fetching...")
    
    let data = {}
    let events = "Tasks\n"
    await fetch('/api/events/list/googleCalendar').then(async (response) => {
        console.log("Success", data.events)
        data = await response.json();
        LoadingBarStatus("ok", "Idle");
        for (var i = 0; i < Object.keys(data.events).length; i++){
            console.log(`${data.events[i]["item"]}) ${data.events[i]["date"]} is ${data.events[i]["event"]}`);
            events += `${Number(data.events[i]["item"]) + 1}) ${data.events[i]["date"]} is ${data.events[i]["event"]}\n`
        }
        screenList.innerHTML = events
    }).catch((err)=>{
        data = {
            "events" : ""
        };
        LoadingBarStatus("failure", "No Events Detected");
    });

    if (data.events == "")
    {
        screenList.innerHTML = `None`;
    }
    idleStatus();
}

async function bListMarkdown() {
    LoadingBarStatus("fetch", "Fetching...")
    var innerString = "Tasks:\n"
    var data = {}
    
    
    await fetch('/api/events/list/markdown')
    .then(async (response) => {
        data = await response.json();
        console.log("Success", data["tasks"]);
        for (var i = 0; i < Object.keys(data["tasks"]).length; i++){
            console.log(` ${i.toString().padStart(2, '0')}) ${data["tasks"][i]}`);
            innerString += `${i.toString().padStart(2, '0')}) ${data["tasks"][i]}\n`
            screenList.innerHTML = innerString;
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
        screenList.innerHTML = `None`;
    }
    
    idleStatus();
}

async function bInputTaskFile() {
    let inputMarkdownAddress = document.getElementById("bPathText");
    LoadingBarStatus("fetch", "Fetching...")
    var markData = {
        "markdown_path": inputMarkdownAddress.value
    }
    if(confirm(`Do you want to save the following Data? Address:${markData["markdown_path"]}`)){  
        await fetch('/api/settings/save', {
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

async function bEventsSync() {
    LoadingBarStatus("fetch", "Fetching...");

    await fetch('/api/events/sync')
    .then((req, res) => {
        LoadingBarStatus("ok", "Synced Events");
    })
    .catch((err) => {
        LoadingBarStatus("failure", err);
    })
    idleStatus();
}

main()