const count = document.getElementById("count");
const recordButton = document.getElementById("record");

let isRecording = false;

chrome.storage.local.get(["isRecording", "events"], (result) => {
  isRecording = result.isRecording ?? false;
  count.textContent = (result.events ?? []).length;
  recordButton.textContent = isRecording ? "Stop Recording" : "Start Recording";
});

recordButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({
    type: isRecording ? "STOP_RECORDING" : "START_RECORDING",
  });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes.events) {
    count.textContent = (changes.events.newValue ?? []).length;
  }

  if (changes.isRecording) {
    isRecording = changes.isRecording.newValue ?? false;
    recordButton.textContent = isRecording
      ? "Stop Recording"
      : "Start Recording";
  }
});
