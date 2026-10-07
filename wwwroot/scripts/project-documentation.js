await new Promise(resolve => {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", resolve, { once: true });
  else resolve();
});

const config = window.PORTFOLIO_SUPABASE_CONFIG;
const bucket = "project-documentation";
const maxFileSize = 10 * 1024 * 1024;
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

const renderMessage = (container, message, isError = false) => {
  const status = container.querySelector("[data-doc-status]");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-error", isError);
};

const mounts = document.querySelectorAll("[data-project-documentation]");
if (mounts.length && (!config?.url || !config?.anonKey)) {
  mounts.forEach(mount => {
    const placeholder = mount.querySelector(".documentation-placeholder");
    if (placeholder) {
      const note = document.createElement("span");
      note.className = "documentation-setup-note";
      note.textContent = "Online uploads are not configured yet.";
      placeholder.append(note);
    }
  });
} else if (mounts.length) {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(config.url, config.anonKey);

  mounts.forEach(mount => {
    const slug = mount.dataset.projectSlug;
    mount.innerHTML = `
      <div class="doc-grid" data-doc-grid></div>
      <p class="doc-status" data-doc-status role="status"></p>
      <details class="doc-admin">
        <summary>Admin access</summary>
        <div class="doc-admin-body">
          <form class="doc-login" data-doc-login>
            <label>Email <input name="email" type="email" autocomplete="username" required></label>
            <label>Password <input name="password" type="password" autocomplete="current-password" required></label>
            <button class="doc-button" type="submit">Sign in</button>
          </form>
          <div class="doc-editor" data-doc-editor hidden>
            <p class="doc-admin-identity" data-doc-identity></p>
            <form class="doc-upload" data-doc-upload>
              <label>Photos <input name="photos" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple required></label>
              <label>Caption (optional) <input name="caption" type="text" maxlength="240"></label>
              <p class="doc-hint">JPEG, PNG, WebP, or GIF · up to 10 MB per image.</p>
              <button class="doc-button" type="submit">Upload documentation</button>
            </form>
            <button class="doc-button doc-button--quiet" type="button" data-doc-signout>Sign out</button>
          </div>
          <p class="doc-status doc-status--admin" data-doc-status role="status"></p>
        </div>
      </details>`;

    const grid = mount.querySelector("[data-doc-grid]");
    const loginForm = mount.querySelector("[data-doc-login]");
    const editor = mount.querySelector("[data-doc-editor]");
    const identity = mount.querySelector("[data-doc-identity]");
    const details = mount.querySelector(".doc-admin");
    const adminStatus = details.querySelector("[data-doc-status]");

    const isAdmin = async userId => {
      const { data, error } = await supabase.rpc("is_portfolio_admin");
      if (error) throw error;
      return data === true;
    };

    const renderDocs = async () => {
      grid.innerHTML = `<div class="documentation-placeholder"><span class="documentation-symbol" aria-hidden="true">＋</span><p>Loading documentation…</p></div>`;
      const { data, error } = await supabase
        .from("project_documentation")
        .select("id, storage_path, caption, created_at")
        .eq("project_slug", slug)
        .order("created_at", { ascending: false });
      if (error) {
        grid.innerHTML = "";
        renderMessage(mount, "Could not load project documentation. Please try again.", true);
        throw error;
      }

      if (!data.length) {
        grid.innerHTML = `<div class="documentation-placeholder"><span class="documentation-symbol" aria-hidden="true">＋</span><p>Visual documentation can be added here</p><span>Images will appear here when available</span></div>`;
        return;
      }

      grid.innerHTML = data.map((item, index) => {
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(item.storage_path);
        return `<figure class="doc-item">
          <img class="case-image" src="${escapeHtml(publicUrl)}" alt="${escapeHtml(item.caption || `Project documentation ${index + 1}`)}" loading="lazy">
          ${item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : ""}
          <button class="doc-delete" type="button" data-doc-delete="${escapeHtml(item.id)}" data-storage-path="${escapeHtml(item.storage_path)}" hidden>Remove photo</button>
        </figure>`;
      }).join("");

      grid.querySelectorAll("[data-doc-delete]").forEach(button => {
        button.hidden = editor.hidden;
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            const { error: rowError } = await supabase.from("project_documentation").delete().eq("id", button.dataset.docDelete);
            if (rowError) throw rowError;
            const { error: fileError } = await supabase.storage.from(bucket).remove([button.dataset.storagePath]);
            if (fileError) throw fileError;
            await renderDocs();
            renderMessage(mount, "Photo removed.");
          } catch (error) {
            button.disabled = false;
            renderMessage(mount, error.message || "Could not remove this photo.", true);
          }
        });
      });
    };

    const setEditor = (user, allowed) => {
      loginForm.hidden = allowed;
      editor.hidden = !allowed;
      details.open = allowed;
      if (allowed) identity.textContent = `Signed in as ${user.email}`;
      mount.querySelectorAll("[data-doc-delete]").forEach(button => { button.hidden = !allowed; });
    };

    loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      const submit = loginForm.querySelector("button[type='submit']");
      submit.disabled = true;
      renderMessage(mount, "Checking admin access…");
      const formData = new FormData(loginForm);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.get("email"),
        password: formData.get("password")
      });
      submit.disabled = false;
      if (error) {
        renderMessage(mount, "Sign-in failed. Check the email and password.", true);
        return;
      }
      try {
        if (!await isAdmin(data.user.id)) {
          await supabase.auth.signOut();
          setEditor(null, false);
          renderMessage(mount, "This account does not have portfolio admin access.", true);
          return;
        }
        setEditor(data.user, true);
        renderMessage(mount, "You can now add or remove documentation.");
        await renderDocs();
      } catch (error) {
        await supabase.auth.signOut();
        setEditor(null, false);
        renderMessage(mount, error.message || "Could not verify admin access.", true);
      }
    });

    mount.querySelector("[data-doc-signout]").addEventListener("click", async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        renderMessage(mount, error.message, true);
        return;
      }
      setEditor(null, false);
      renderMessage(mount, "Signed out.");
    });

    mount.querySelector("[data-doc-upload]").addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const submit = form.querySelector("button[type='submit']");
      const formData = new FormData(form);
      const photos = [...formData.getAll("photos")].filter(file => file instanceof File && file.size > 0);
      const caption = String(formData.get("caption") || "").trim();
      if (!photos.length) {
        renderMessage(mount, "Choose at least one image to upload.", true);
        return;
      }
      if (photos.some(file => !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > maxFileSize)) {
        renderMessage(mount, "Use JPEG, PNG, WebP, or GIF images up to 10 MB each.", true);
        return;
      }

      submit.disabled = true;
      renderMessage(mount, `Uploading ${photos.length} photo${photos.length === 1 ? "" : "s"}…`);
      try {
        for (const file of photos) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "photo";
          const storagePath = `${slug}/${crypto.randomUUID()}-${safeName}`;
          const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, {
            contentType: file.type,
            upsert: false
          });
          if (uploadError) throw uploadError;

          const { data: { user } } = await supabase.auth.getUser();
          const { error: insertError } = await supabase.from("project_documentation").insert({
            project_slug: slug,
            storage_path: storagePath,
            caption,
            created_by: user.id
          });
          if (insertError) {
            const { error: cleanupError } = await supabase.storage.from(bucket).remove([storagePath]);
            if (cleanupError) console.error("Uploaded file cleanup failed:", cleanupError);
            throw insertError;
          }
        }
        form.reset();
        await renderDocs();
        renderMessage(mount, "Documentation uploaded.");
      } catch (error) {
        renderMessage(mount, error.message || "Upload failed. Please try again.", true);
      } finally {
        submit.disabled = false;
      }
    });

    const initialize = async () => {
      await renderDocs();
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) return;
      try {
        const allowed = await isAdmin(session.user.id);
        if (allowed) setEditor(session.user, true);
        else await supabase.auth.signOut();
      } catch (error) {
        await supabase.auth.signOut();
        renderMessage(mount, error.message || "Could not verify admin access.", true);
      }
    };

    initialize().catch(error => {
      console.error("Project documentation initialization failed:", error);
      renderMessage(mount, error.message || "Project documentation could not be initialized.", true);
    });
  });
}
