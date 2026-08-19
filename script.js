function typeWriter(element, text, delay = 80) {
  let i = 0;
  element.textContent = '';
  function type() {
    if (i < text.length) {
      element.textContent += text[i++];
      setTimeout(type, delay);
    }
  }
  type();
}

document.addEventListener('DOMContentLoaded', () => {
  const titleElem = document.querySelector('.login-title');
  if (titleElem) {
    const originalText = titleElem.textContent.trim();
    typeWriter(titleElem, originalText);
  }
  if (validLogin) {
  // Instead of hiding/showing divs, redirect after login success
  window.location.href = "index2.html";
}
});
