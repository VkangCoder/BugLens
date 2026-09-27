document.addEventListener("click", function (event) {
  const target = event.target;

  chrome.runtime.sendMessage({
    type: "CLICK",
    data: {
      tagName: target.tagName,
      text: (target.textContent ?? "").trim().slice(0, 100),
      url: location.href,
      timestamp: new Date().toISOString(),
    },
  });
});
