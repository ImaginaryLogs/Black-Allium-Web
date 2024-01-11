console.log("Script Loaded.");

var cssProps = document.querySelector(":root");
var screenList = document.getElementById("screenList");
var isDarkMode = true;

function main() {
  const ctrlButtons = {
    bTheme: [bUpdateWebTheme, {}],
    bList: [bListGoogleCalendar, {}],
    bPath: [bInputTaskFile, {}],
    bMdList: [bListMarkdown, {}],
    bAddEvents: [bEventsSync, {}],
  };

  Object.entries(ctrlButtons).forEach(([buttonName, value]) => {
    value[1] = document.getElementById(buttonName);
    if (value[1] != null) value[1].onclick = value[0];
  });

  const buttonsValid = document.getElementsByClassName("pressable");
  const clickSound = new Audio("../sounds/buttonClick.mp3");
  for (const button of buttonsValid) {
    console.log(button);
    button.addEventListener("click", () => {
      clickSound.play();
    });
  }

  const forms = document.getElementsByTagName("form");
  for (const form of forms) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log(e.target.clientUpload);
      let file = e.target.clientUpload.files[0];
      filesend(file, `/api/client/save`);
    });
  }

  const buttonsExpandable =
    document.getElementsByClassName("expandable_button");
  if (buttonsExpandable) {
    for (const expandableButton of buttonsExpandable) {
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
      });
    }
  }

  window.onscroll = function () {
    stickyDetection();
  };

  window.addEventListener("load", async () => {
    let response = {};
    await fetch("/api/settings/load")
      .then(async (res) => {
        console.log(res);
        response = await fetch("/api/settings/load");
      })
      .catch(async (err) => {
        console.error(err);
        await bUpdateWebTheme().then(async () => {
          response = await fetch("/api/settings/load");
        });
      });
    console.log(response);
    const data = await response.json();
    console.log("Loaded");
    console.log(data);
    cssProps.style.setProperty("--bg", data.web["--bg"]);
    cssProps.style.setProperty("--text", data.web["--text"]);
    isDarkMode = data.web["--text"] == "white" ? true : false;
    cssProps.style.getPropertyValue("--bg");
    const loading_screen = document.getElementById("loading");
    if (loading_screen != null) {
      loading_screen.classList.add("transparent");
      setTimeout(() => {
        loading_screen.classList.add("hidden");
      }, 250);
    }
  });
}

const stickyDetection = () => {
  const navbarYPos = document.getElementById("navbar")?.offsetTop;
  window.scrollY >= navbarYPos
    ? navbar.classList.add("sticky")
    : navbar.classList.remove("sticky");
};

const LoadingBarStatus = async (status, message) => {
  const loadingBar = document
    .getElementById("statusPanel")
    ?.getElementsByClassName("loading_bar");
  const statusSign = document.getElementById("statusSign");
  const statusMessage = statusSign?.getElementsByTagName("b");
  statusSign.innerHTML = "<b>Status:</b> " + message;
  switch (status) {
    case "fail":
    case "failure":
      loadingBar[0].classList.add("hidden");
      statusMessage[0].style.setProperty("color", "red");
      break;
    case "fetch":
      loadingBar[0].classList.remove("hidden");
      statusMessage[0].style.setProperty("color", "yellow");
      break;
    case "idle":
    case "ok":
    default:
      loadingBar[0].classList.add("hidden");
      statusMessage[0].style.setProperty("color", "green");
      break;
  }
};

const idleStatus = async () => {
  const message = "Idle";
  setTimeout(() => {
    LoadingBarStatus("green", message);
  }, 2000);
};

const bUpdateWebTheme = () => {
  if (isDarkMode) {
    cssProps.style.setProperty("--bg", "white");
    cssProps.style.setProperty("--text", "#080808");
    isDarkMode = false;
  } else {
    cssProps.style.setProperty("--bg", "#080808");
    cssProps.style.setProperty("--text", "white");
    isDarkMode = true;
  }
  var docProperties = getComputedStyle(cssProps);
  var colorObj = {
    web: {
      "--bg": docProperties.getPropertyValue("--bg"),
      "--text": docProperties.getPropertyValue("--text"),
    },
  };
  fetch("/api/settings/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(colorObj),
  });
};

const bListGoogleCalendar = async () => {
  LoadingBarStatus("fetch", "Fetching...");

  let data = {};
  let events = "Tasks\n";

  const response = await prowrap(fetch("/api/events/list/googleCalendar"));

  if (response.error) {
    data = { events: "" };
    LoadingBarStatus("failure", "No Events Detected");
  } else {
    console.log("Success", data.events);
    data = await response.data.json();
    console.log(data);
    if (data.events == "")
      return LoadingBarStatus("failure", "No Events Detected");
    LoadingBarStatus("ok", "Idle");
    for (var i = 0; i < Object.keys(data.events).length; i++) {
      console.log(
        `${data.events[i]["item"]}) ${data.events[i]["date"]} is ${data.events[i]["event"]}`
      );
      events += `${Number(data.events[i]["item"]) + 1}) ${
        data.events[i]["date"]
      } is ${data.events[i]["event"]}\n`;
    }
  }
  screenList.innerHTML = data.events == "" ? `None` : events;

  idleStatus();
};

const bListMarkdown = async () => {
  LoadingBarStatus("fetch", "Fetching...");
  var innerString = "Tasks:\n";
  var data = {};

  await fetch("/api/events/list/markdown")
    .then(async (response) => {
      data = await response.json();
      console.log("Success", data["tasks"]);
      for (var i = 0; i < Object.keys(data["tasks"]).length; i++) {
        console.log(` ${i.toString().padStart(2, "0")}) ${data["tasks"][i]}`);
        innerString += `${i.toString().padStart(2, "0")}) ${
          data["tasks"][i]
        }\n`;
        screenList.innerHTML = innerString;
      }
      LoadingBarStatus("ok", "Idle");
      console.log(data);
    })
    .catch((err) => {
      data = {
        events: "",
      };
      LoadingBarStatus("failure", "No Events Detected in Markdown List");
    });

  if (data.events == "") {
    screenList.innerHTML = `None`;
  }

  idleStatus();
};

const bInputTaskFile = async () => {
  let inputMarkdownAddress = document.getElementById("bPathText");
  LoadingBarStatus("fetch", "Fetching...");
  console.log("bInputTaskFile");
  var markData = { markdown_path: inputMarkdownAddress.value };
  if (
    !confirm(
      `Do you want to save the following Data? Address:${markData["markdown_path"]}`
    )
  ) {
    LoadingBarStatus("failure", "Data not submitted");
    return idleStatus();
  }
  const response = await prowrap(
    fetch("/api/settings/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(markData),
    })
  );
  if (response.error) {
    LoadingBarStatus("failure", "Data failed to be saved");
    console.error(err);
    return idleStatus();
  }
  LoadingBarStatus("ok", "Data saved");
  idleStatus();
};

const bEventsSync = async () => {
  LoadingBarStatus("fetch", "Fetching...");

  const response = await prowrap(fetch("/api/events/sync"));
  if (response.error) {
    LoadingBarStatus("failure", err);
    return idleStatus();
  }
  let eventsAdded = await response.data.json();
  LoadingBarStatus("ok", `Synced Events:`);
  screenList.innerHTML = JSON.stringify(eventsAdded);

  idleStatus();
};

const bClientSecrets = async () => {
  LoadingBarStatus("fetch", "Fetching...");
  let inputJSON = document.getElementById("bPathText");
  var client_secrets = { value: inputJSON.files[0] };

  console.log(client_secrets.value);
  if (
    !confirm(
      `Do you want to save the following Data? Address:\n${client_secrets.value}`
    )
  ) {
    LoadingBarStatus("failure", "User did not send the Data");
    idleStatus();
    return;
  }
  const response = await prowrap(
    fetch("/api/client/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(client_secrets),
    })
  );
  console.log(response);
};

const filesend = async (file, url) => {
  const fileReader = new FileReader();
  const uploader = async (event) => {
    const fileContent = event.target.result;
    const CHUNK_SIZE = 8000; //Kilobytes
    const totalChunks = fileContent.byteLength / CHUNK_SIZE;
    for (let chunk = 0; chunk < totalChunks + 1; chunk++) {
      let DATACHUNK = fileContent.slice(
        chunk * CHUNK_SIZE,
        (chunk + 1) * CHUNK_SIZE
      );
      await fetch(url + "?filename=" + file.name, {
        method: "POST",
        headers: {
          "content-type": "application/octet-stream",
          "content-length": DATACHUNK.length,
        },
        body: DATACHUNK,
      });
    }
  };
  fileReader.readAsArrayBuffer(file);
  fileReader.onload = uploader;
};

const prowrap = async (promise, isLogging = false) => {
  try {
    const result = await Promise.allSettled([promise]);
    if (result.find((res) => res.status === "fulfilled"))
      return {
        data: result.find((res) => res.status === "fulfilled")?.value,
        error: null,
      };

    const error = result.find((res) => res.status === "rejected")?.reason;
    if (isLogging) console.log(result);
    return { data: null, error: error };
  } catch (error) {
    if (isLogging) console.log(error);
    return { data: null, error: error };
  }
};

main();
