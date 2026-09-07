// Mobile hamburger toggle
const hamburger = document.getElementById("hamburger");
const sidebar = document.querySelector(".sidebar");

if (hamburger && sidebar) {
  hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  // close the menu when a nav link is tapped
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => sidebar.classList.remove("open"));
  });
}
