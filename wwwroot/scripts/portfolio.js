(() => {
  const data = window.PORTFOLIO_DATA;
  if (!data) {
    throw new Error("Portfolio data did not load.");
  }

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  const validUrl = value => {
    if (!value) return "";
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
      return "";
    }
  };

  const mediaUrl = value => value && value.startsWith("/") && !value.startsWith("//") ? value : validUrl(value);
  const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
  const isRootPage = currentPath === "/" || currentPath === "/index.html";
  const workPrefix = isRootPage ? "./" : "../";
  const projectUrl = project => `${workPrefix}work/index.html?project=${encodeURIComponent(project.slug)}`;
  const searchParams = new URLSearchParams(window.location.search);
  const hashSlug = window.location.hash.replace(/^#/, "");
  const path = currentPath;
  const workSlug = searchParams.get("project") || hashSlug || (path.startsWith("/work/") ? path.slice("/work/".length).split("/")[0] : "");
  const projectVisual = project => `
    <span class="project-visual visual-${escapeHtml(project.visual)}" aria-hidden="true">
      <span class="visual-orbit"></span><span class="visual-orbit visual-orbit--inner"></span>
      <span class="visual-mark">${escapeHtml(project.visual === "visual" ? "Aa" : String(project.year).slice(0, 4))}</span>
      <span class="visual-caption">Documentation can be added here</span>
    </span>`;
  const socialIcons = {
    in: '<path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12Zm1.78 13.02H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.23 0Z"/>',
    gh: '<path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.74.08-.74 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.49.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.45 11.45 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.3c0 .32.22.7.83.58A12 12 0 0 0 12 .3Z"/>',
    ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".75" fill="currentColor" stroke="none"/>',
    tt: '<path d="M19.6 6.7a5.2 5.2 0 0 1-3.2-1.1 5.2 5.2 0 0 1-1.8-2.8H11v13.4a2.9 2.9 0 1 1-2-2.8V10a6.8 6.8 0 1 0 5.6 6.7V9.8a8.8 8.8 0 0 0 5 1.5V7.8a5.2 5.2 0 0 1-0 0Z"/>'
  };
  const socialIcon = icon => `<svg class="social-icon social-icon--${escapeHtml(icon)}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${socialIcons[icon] || ""}</svg>`;

  const projectCard = project => `
    <article class="archive-card">
      <a class="archive-art visual-${escapeHtml(project.visual)}" href="${projectUrl(project)}" aria-label="Read ${escapeHtml(project.title)}">
        ${projectVisual(project)}
        <span class="archive-art-label">${escapeHtml(project.category)} · ${escapeHtml(project.year)}</span>
        <span class="archive-art-arrow" aria-hidden="true">↗</span>
      </a>
      <div class="archive-meta"><h3><a href="${projectUrl(project)}">${escapeHtml(project.title)}</a></h3><span>${escapeHtml(project.year)}</span></div>
      <p class="archive-description">${escapeHtml(project.description)}</p>
      <a class="text-link" href="${projectUrl(project)}">Explore project <span aria-hidden="true">↗</span></a>
    </article>`;

  const renderProjectList = (container, projects) => {
    container.innerHTML = projects.map(projectCard).join("");
  };

  document.querySelectorAll("[data-project-list='featured']").forEach(container => {
    renderProjectList(container, data.projects.filter(project => project.featured).slice(0, 4));
  });

  document.querySelectorAll("[data-social-links]").forEach(container => {
    const links = data.socialLinks.map(link => ({ ...link, safeUrl: validUrl(link.url) })).filter(link => link.safeUrl);
    container.innerHTML = links.map(link => `
      <a class="elsewhere-line" href="${escapeHtml(link.safeUrl)}" target="_blank" rel="noopener noreferrer">
        <span>${escapeHtml(link.name.toUpperCase())} · ${escapeHtml(link.icon.toUpperCase())}</span>
        <strong>${escapeHtml(link.description)}</strong><span aria-hidden="true">↗</span>
      </a>`).join("");
  });

  document.querySelectorAll("[data-social-actions]").forEach(container => {
    const links = data.socialLinks.map(link => ({ ...link, safeUrl: validUrl(link.url) })).filter(link => link.safeUrl);
    container.innerHTML = links.map(link => `
      <a class="contact-action" href="${escapeHtml(link.safeUrl)}" target="_blank" rel="noopener noreferrer">
        ${socialIcon(link.icon)}<span class="contact-action-label">${escapeHtml(link.name)}</span><span class="contact-action-arrow" aria-hidden="true">↗</span>
      </a>`).join("");
  });

  document.querySelectorAll("[data-skills-preview]").forEach(container => {
    container.innerHTML = data.skills.map(group => `
      <div class="skill-group"><h3>${escapeHtml(group.name)}</h3><p>${group.items.slice(0, 3).map(escapeHtml).join(" · ")}</p></div>
    `).join("");
  });

  const renderWork = () => {
    const page = document.querySelector("[data-work-list]");
    if (!page) return;
    const filters = [...document.querySelectorAll("[data-work-filter]")];
    const list = page.querySelector("[data-work-results]");
    const empty = page.querySelector("[data-work-empty]");
    const update = group => {
      const projects = group === "all" ? data.projects : data.projects.filter(project => project.group === group);
      renderProjectList(list, projects);
      empty.hidden = projects.length > 0;
      filters.forEach(filter => {
        const selected = filter.dataset.workFilter === group;
        filter.classList.toggle("is-active", selected);
        filter.setAttribute("aria-pressed", String(selected));
      });
    };
    filters.forEach(filter => filter.addEventListener("click", () => update(filter.dataset.workFilter)));
    update("all");
  };

  const projectSection = (title, content) => content
    ? `<section class="case-section"><p class="case-kicker">${escapeHtml(title)}</p><div class="case-copy">${escapeHtml(content)}</div></section>`
    : "";

  const renderProjectDetail = project => {
    const page = document.querySelector("[data-project-detail]");
    if (!page) return;
    document.title = `${project.title} — Mesha`;
    const tags = Array.isArray(project.tags) ? project.tags : [];
    const images = [project.image, ...(Array.isArray(project.gallery) ? project.gallery : [])].map(mediaUrl).filter(Boolean);
    const skills = Array.isArray(project.skills) && project.skills.length
      ? `<section class="case-section"><p class="case-kicker">Skills involved</p><div class="tag-list">${project.skills.map(skill => `<span class="skill-chip">${escapeHtml(skill)}</span>`).join("")}</div></section>`
      : "";
    const outcome = project.outcome ? projectSection("Outcome", project.outcome) : "";
    const external = validUrl(project.externalLink);
    const github = validUrl(project.github);
    const video = validUrl(project.video);
    const documentLink = validUrl(project.document);
    const links = [
      external && { label: "Project link", url: external },
      github && { label: "GitHub", url: github },
      video && { label: "Video", url: video },
      documentLink && { label: "Document", url: documentLink }
    ].filter(Boolean);
    page.innerHTML = `
      <a class="back-link" href="${workPrefix}work/index.html">← Back to selected work</a>
      <header class="case-hero">
        <p class="route-eyebrow">${escapeHtml(project.year)} <span>·</span> ${escapeHtml(project.category)}</p>
        <h1>${escapeHtml(project.title)}</h1>
        ${project.role ? `<p class="case-role">${escapeHtml(project.role)}</p>` : ""}
        <p class="case-overview">${escapeHtml(project.overview || project.description)}</p>
        <div class="case-tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      </header>
      <div class="case-layout">
        <div class="case-story">
          ${projectSection("Overview", project.overview || project.description)}
          ${projectSection("Context", project.context)}
          ${projectSection("My role", project.role)}
          ${projectSection("What I did", project.whatIDid)}
          ${projectSection("Process", project.process)}
          ${outcome}
          ${projectSection("What I learned", project.learned)}
          ${skills}
          ${links.length ? `<section class="case-section"><p class="case-kicker">Links</p><div class="case-links">${links.map(link => `<a class="text-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)} ↗</a>`).join("")}</div></section>` : ""}
        </div>
        <aside class="case-documentation">
          <p class="case-kicker">Visual documentation</p>
          <div class="doc-gallery" data-project-documentation data-project-slug="${escapeHtml(project.slug)}" aria-live="polite">
            ${images.map((image, index) => `<img class="case-image" src="${escapeHtml(image)}" alt="${escapeHtml(project.title)} documentation ${index + 1}">`).join("")}
            ${images.length ? "" : `<div class="documentation-placeholder"><span class="documentation-symbol" aria-hidden="true">＋</span><p>Visual documentation can be added here</p><span>Images will appear here when available</span></div>`}
          </div>
        </aside>
      </div>
      <a class="back-link back-link--bottom" href="${workPrefix}work/index.html">← Back to selected work</a>`;
  };

  const renderAbout = () => {
    const page = document.querySelector("[data-about-page]");
    if (!page) return;
    page.innerHTML = `
      <p class="route-eyebrow">A little context</p>
      <h1>Still figuring<br><em>it out.</em></h1>
      <div class="editorial-columns">
        <p class="editorial-lede">${escapeHtml(data.personal.title)}, interested in how technology, data, and visual communication can help make sense of ideas.</p>
        <div class="editorial-copy">
          <section><h2>Who I am</h2><p>${escapeHtml(data.personal.introduction)}</p></section>
          <section><h2>My background</h2><p>I’m an undergraduate student building my experience through student projects, organizational activities, and visual designs.</p></section>
          <section><h2>What I’m interested in</h2><p>Information systems, technology, data, visual communication, and practical problem solving—especially where clear thinking and thoughtful presentation meet.</p></section>
          <section><h2>What I’m learning</h2><p>${escapeHtml(data.personal.direction)}</p></section>
        </div>
      </div>
      <a class="text-link" href="${workPrefix}work/index.html">A few things I’ve worked on <span aria-hidden="true">↗</span></a>`;
  };

  const renderPath = () => {
    const page = document.querySelector("[data-path-page]");
    if (!page) return;
    page.innerHTML = data.path.map((item, index) => `
      <details class="path-entry">
        <summary><span class="path-count">0${index + 1}</span><span>${escapeHtml(item.title)}</span><span class="path-plus" aria-hidden="true">+</span></summary>
        <p>${escapeHtml(item.detail)}</p>
      </details>`).join("");
  };

  const renderSkills = () => {
    const page = document.querySelector("[data-skills-page]");
    if (!page) return;
    page.innerHTML = data.skills.map(group => `
      <section class="skill-collection">
        <div><p class="route-eyebrow">A growing toolkit</p><h2>${escapeHtml(group.name)}</h2><p>${escapeHtml(group.note)}</p></div>
        <div class="tag-list">${group.items.map(item => `<span class="skill-chip">${escapeHtml(item)}</span>`).join("")}</div>
      </section>`).join("");
  };

  const renderWorkPage = () => {
    const listPage = document.querySelector("[data-work-list]");
    const detailPage = document.querySelector("[data-project-detail]");
    if (workSlug) {
      const project = data.projects.find(item => item.slug === workSlug);
      const page = detailPage;
      if (listPage) listPage.hidden = true;
      if (page) page.hidden = false;
      if (project && page) {
        renderProjectDetail(project);
      } else if (page) {
        document.title = "Project not found — Mesha";
        page.innerHTML = `<div class="not-found"><p class="route-eyebrow">Not in the archive</p><h1>This project isn’t here.</h1><a class="text-link" href="${workPrefix}work/index.html">Back to all work ↗</a></div>`;
      }
      return;
    }
    if (detailPage) detailPage.hidden = true;
    if (listPage) listPage.hidden = false;
    renderWork();
  };

  renderWorkPage();
  renderAbout();
  renderPath();
  renderSkills();

  const menuButton = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-site-nav]");
  if (menuButton && menu) {
    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      menu.classList.toggle("is-open", !isOpen);
    });
    menu.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
      menuButton.setAttribute("aria-expanded", "false");
      menu.classList.remove("is-open");
    }));
  }

  const year = document.querySelector("[data-current-year]");
  if (year) year.textContent = new Date().getFullYear();
  const homeYear = document.getElementById("year");
  if (homeYear) homeYear.textContent = new Date().getFullYear();

  const revealItems = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12 });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add("visible"));
  }
})();
