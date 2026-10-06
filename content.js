function handleClick(event) {
  if (!chrome.runtime?.id) {
    document.removeEventListener("click", handleClick);
    return;
  }

  const target = event.target;

  try {
    chrome.runtime.sendMessage({
      type: "CLICK",
      data: {
        tagName: target.tagName,
        text: (target.textContent ?? "").trim().slice(0, 100),
        url: location.href,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    document.removeEventListener("click", handleClick);
  }
}

document.addEventListener("click", handleClick);
