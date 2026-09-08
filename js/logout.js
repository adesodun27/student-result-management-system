/* LOGOUT — signs out of Supabase, then goes to the login page. */
const logoutLink = document.querySelector(".logout");

if (logoutLink) {
  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await db.auth.signOut();
    } catch (err) {
      console.error(err);
    }
    // pages are in pages/admin, pages/lecturer, pages/student → login is at pages/login.html
    location.href = "../login.html";
  });
}

