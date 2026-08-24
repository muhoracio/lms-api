const BASE = "/api";

const esc = (v) =>
  String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const secToMin = (seconds) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padEnd(2, "0");
  return `${mm}:${ss}`;
};

const routes = document.querySelectorAll("section[data-role]");

const navs = document.querySelectorAll("nav[data-role]");

function handleUserNav(user) {
  for (const nav of navs) {
    if (nav.dataset.role === user) {
      nav.classList.add("active");
    } else {
      nav.classList.remove("active");
    }
  }
}

let user;
async function getUser() {
  user = "public";
  try {
    const response = await fetch(BASE + "/auth/session");
    if (!response.ok) throw new Error();
    const body = await response.json();
    if (body.role) user = body.role;
  } catch (error) {
  } finally {
    handleUserNav(user);
  }
}

function renderResetCourseButton(courseId) {
  setTimeout(() => {
    sendForm("DELETE", "/lms/course/reset", "resetar-curso", () => {
      location.reload();
    });
  }, 50);
  return /* html */ `
          <div id="resetar-curso">
            <form>
              <input type="hidden" name="courseId" value="${esc(courseId)}" />
              <button>Resetar</button>
            </form>  
          </div>
        `;
}

function renderCompleteButton(courseId, lessonId) {
  setTimeout(() => {
    sendForm("POST", "/lms/lesson/complete", "completar", () => {
      document.getElementById("completar").innerHTML = "<span></span>";
    });
  }, 50);
  return /* html */ `
          <div id="completar">
            <form>
              <input type="hidden" name="courseId" value="${esc(courseId)}" />
              <input type="hidden" name="lessonId" value="${esc(lessonId)}" />
              <button>Completar</button>
            </form>  
          </div>
        `;
}

const data = {
  cursos(el) {
    getData("/lms/courses", (courses) => {
      const render = el.querySelector(".render");
      let html = "";
      for (const course of courses) {
        html += /* html */ `
                <div class="curso-item">
                  <h2>${esc(course.title)}</h2>
                  <p>${esc(course.description)}</p>
                  <span>Aulas: ${esc(course.lessons)}</span>
                  <span>Horas: ${esc(course.hours)}</span>
                  <a class="btn" href="#/curso/${esc(course.slug)}">
                    ${esc(course.title)}
                  </a>
                </div>
              `;
      }
      render.innerHTML = html;
    });
  },
  curso(el) {
    const [_, slug] = location.hash.replace("#", "").split("/").filter(Boolean);
    if (!slug) return;
    getData(`/lms/course/${slug}`, (data) => {
      const { course, lessons, completed } = data;
      const render = el.querySelector(".render");
      render.innerHTML = "";
      let html = /* html */ `
              <div class="curso-item">
                <h2>${esc(course.title)}</h2>
                <p>${esc(course.description)}</p>
                <span>Aulas: ${esc(course.lessons)}</span>
                <span>Horas: ${esc(course.hours)}</span>
              </div>
            `;
      html += '<ul class="curso-aulas">';
      for (const lesson of lessons) {
        const isCompleted = completed.some((x) => x.lesson_id == lesson.id);
        html += /* html */ `
                <li>
                  <a href="#/aula/${esc(course.slug)}/${lesson.slug}">
                    ${esc(lesson.title)}
                    <span>
                      <span>${secToMin(lesson.seconds)}</span>
                      <span class="status ${isCompleted ? "completa" : ""}"></span>
                    </span>
                  </a>
                </li>
              `;
      }
      html += `</ul>
              ${completed.length > 0 ? renderResetCourseButton(course.id) : ""}
            `;
      render.innerHTML = html;
    });
  },
  aula(el) {
    const [_, curso, aula] = location.hash
      .replace("#", "")
      .split("/")
      .filter(Boolean);
    if (!curso || !aula) return;
    getData(`/lms/lesson/${curso}/${aula}`, (lesson) => {
      const render = el.querySelector(".render");
      render.innerHTML = "";
      let html = /* html */ `
              <div>
                <h2>${esc(lesson.title)}</h2>
                <div id="breadcrumb">
                  <a href="#/cursos">cursos</a> >
                  <a href="#/curso/${curso}">${curso}</a>  
                </div>
                <div id="video">
                  <video poster="" preload="metadata" src="${lesson.video}" controls></video>
                </div>
                <nav id="aula-nav">
                  ${lesson.prev ? `<a class="btn" href="${esc(`#/aula/${curso}/${lesson.prev}`)}">Anterior</a>` : "<span></span>"}
                  ${!lesson.completed ? renderCompleteButton(lesson.course_id, lesson.id) : "<span></span>"}
                  ${lesson.next ? `<a class="btn" href="${esc(`#/aula/${curso}/${lesson.next}`)}">Próxima</a>` : "<span></span>"}
                </nav>
              </div>
            `;
      render.innerHTML = html;
    });
  },
  certificados(el) {
    getData("/lms/certificates", (certificates) => {
      if (!Array.isArray(certificates) || !certificates.length) return;
      const render = el.querySelector(".render");
      render.innerHTML = "";
      let html = "<ul>";
      for (const certificate of certificates) {
        html += /* html */ `
                <li>
                  <a class="btn" target="_blank" href="/api/lms/certificate/${certificate.id}">
                    ${esc(certificate.title)}
                    <span>${certificate.completed.slice(0, 10).split("-").reverse().join("/")}</span>
                  </a>
                </li>
              `;
      }
      html += "</ul>";
      render.innerHTML = html;
    });
  },
  async sair(el) {
    await fetch(BASE + "/auth/logout", {
      method: "DELETE",
    });
    user = "public";
    location.hash = "/login";
    handleUserNav(user);
  },
  resetar(el) {
    const query = location.hash.split("=");
    if (!query[1]) return;
    const token = query[1];
    const tokenEl = document.querySelector('input[name="token"]');
    if (!tokenEl) return;
    tokenEl.value = token;
  },
  ["criar-curso"](el) {
    getData("/lms/courses", (courses) => {
      const render = el.querySelector(".render");
      const form = el.querySelector("form");
      const deleteButton = form.querySelector(".delete-button");
      render.innerHTML = "";
      const select = document.createElement("select");
      select.name = "courses-select";
      select.add(new Option("Selecionar Curso", null));
      for (const course of courses) {
        select.add(new Option(course.title, course.slug));
      }
      select.addEventListener("change", (e) => {
        e.preventDefault();
        const course = courses.find((c) => c.slug == select.value);
        if (!course) {
          deleteButton.classList.add("hidden");
          return;
        }
        for (const key in course) {
          const input = form.querySelector(`[name="${key}"]`);
          if (!input) continue;
          input.value = course[key];
        }
        deleteButton.classList.remove("hidden");
      });
      render.append(select);
    });
  },
  ["criar-aula"](el) {
    getData("/lms/lessons", (lessons) => {
      const render = el.querySelector(".render");
      const form = el.querySelector("form");
      const deleteButton = form.querySelector(".delete-button");
      render.innerHTML = "";
      const select = document.createElement("select");
      select.name = "lessons-select";
      select.add(new Option("Selcionar Aula", null));
      let i = 0;
      for (const lesson of lessons) {
        select.add(new Option(`${lesson["courseSlug"]} - ${lesson.title}`, i));
        i++;
      }
      select.addEventListener("change", (e) => {
        e.preventDefault();
        const lesson = lessons[select.value];
        if (!lesson) {
          deleteButton.classList.add("hidden");
          return;
        }
        for (const key in lesson) {
          const input = form.querySelector(`[name="${key}"]`);
          if (!input) continue;
          input.value = lesson[key];
        }
        deleteButton.classList.remove("hidden");
      });
      render.append(select);
    });
  },
  usuarios(el) {
    const render = el.querySelector(".render");
    getData("/auth/users/search", (users, response) => {
      const total = Number(response.headers.get("X-Total-Count"));
      renderUsers(users, total, render);
    });
    const form = document.querySelector("#usuarios form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      getData(
        `/auth/users/search?s=${data.get("s")}&page=${data.get("page")}`,
        (users, response) => {
          const total = Number(response.headers.get("X-Total-Count"));
          renderUsers(users, total, render);
        },
      );
    });
  },
};

function renderUsers(users, total, render) {
  const form = document.querySelector("#usuarios form");
  const page = document.querySelector("#page");
  render.innerHTML = "";
  let html = "<ul>";
  const pages = document.createElement("nav");
  pages.id = "pages";
  const totalPages = Math.ceil(total / 5);
  if (totalPages > 1) {
    for (let i = 1; i <= totalPages; i++) {
      const button = document.createElement("button");
      button.innerText = i;
      button.addEventListener("click", (e) => {
        page.value = i;
        form.requestSubmit();
      });
      pages.append(button);
    }
  }
  for (const user of users) {
    html += /* html */ `<li>
            <span>${esc(user.name)}</span>  
            <span>${esc(user.email)}</span>  
          </li>`;
  }
  html += "</ul>";
  render.innerHTML = html;
  render.append(pages);
}

async function router() {
  if (!user) await getUser();

  routes.forEach((r) => r.classList.remove("active"));

  const r = location.hash.replace("#", "").split("/").filter(Boolean).shift();
  const route = document.getElementById(r);
  if (!route) {
    if (typeof data[r] === "function") data[r]();
    return;
  }

  if (user !== route.dataset.role) {
    location.hash = "/login";
    return;
  }

  route.classList.add("active");
  if (typeof data[r] === "function") data[r](route);
}
window.addEventListener("DOMContentLoaded", router);
window.addEventListener("hashchange", router);

async function getData(url, callback) {
  const response = await fetch(BASE + url);
  const body = await response.json();
  callback(body, response);
}

// FORMULÁRIOS
async function sendForm(method, url, id, callback) {
  const form = document.querySelector(`#${id} form`);
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    let response;
    let body = {};
    const badge = document.createElement("div");
    try {
      response = await fetch(BASE + url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      body = await response.json();
      if (!response.ok) throw new Error();
      badge.classList.add("ok");
      badge.innerText = `${response.status}`;
      if (typeof callback === "function") callback(response, body);
    } catch (error) {
      badge.classList.add("fail");
      badge.innerText = `${response.status} - ${body?.title || "Um erro aconteceu."}`;
    } finally {
      form.append(badge);
      setTimeout(() => badge?.remove(), 1500);
    }
  });
}

sendForm("POST", "/auth/login", "login", async () => {
  await getUser();
  if (user === "user") location.hash = "/cursos";
  if (user === "admin") location.hash = "/criar-curso";
});

sendForm("POST", "/auth/user", "cadastrar", () => {
  location.hash = "/login";
});

sendForm("POST", "/auth/password/forgot", "perdeu", () => {});
sendForm("POST", "/auth/password/reset", "resetar", () => {
  setTimeout(() => {
    location.hash = "/login";
  }, 1500);
});

sendForm("POST", "/lms/course", "criar-curso");

// Deletar registro
async function handleDeleteButton(e) {
  e.preventDefault();
  const button = e.currentTarget;
  const url = button.getAttribute("data-url");
  const form = button.parentElement.parentElement;
  const id = form.querySelector('input[name="id"]')?.value ?? null;
  if (!id) return;
  const response = await fetch(`${BASE}/${url}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const json = await response.json();
    return alert(json.title);
  }
  location.reload();
}
const deleteButton = document.querySelectorAll(".delete-button");
deleteButton.forEach((button) => {
  button.addEventListener("click", handleDeleteButton);
});

// Upload de arquivo
const lessonsForm = document.querySelector("#criar-aula form");
lessonsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = new FormData(lessonsForm);

    const input = lessonsForm.querySelector('input[type="file"]');
    if (input && input.files && input.files.length !== 0) {
      const files = input.files;
      const responseFile = await fetch(BASE + "/files/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-filename": files[0].name,
          "x-visibility": data.get("free") === "1" ? "public" : "private",
        },
        body: files[0],
      });
      if (!responseFile.ok) throw new Error();
      const upload = await responseFile.json();
      data.set("video", upload.path);
    }

    const responseLesson = await fetch(BASE + "/lms/lesson", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(Object.fromEntries(data)),
    });
    if (responseLesson.ok) {
      location.reload();
    }
  } catch (error) {
    console.log(error);
  }
});
