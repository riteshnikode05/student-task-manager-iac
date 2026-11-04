/**
 * worker.js  –  Student Task Manager
 * -----------------------------------
 * Cloudflare Worker that:
 *   • Serves the single-page frontend (GET /)
 *   • Exposes a JSON REST API backed by Workers KV
 *
 * KV binding name : TASKS_KV   (declared in Terraform main.tf)
 *
 * REST API
 * --------
 *   POST   /api/tasks          – Create a task
 *   GET    /api/tasks          – List all tasks
 *   GET    /api/tasks/:id      – Get one task
 *   PUT    /api/tasks/:id      – Update a task
 *   DELETE /api/tasks/:id      – Delete a task
 */

// ── Helpers ───────────────────────────────────────────────────────

/** Generate a compact unique Task ID like "T1234" */
function generateId() {
  return "T" + Math.floor(1000 + Math.random() * 9000);
}

/** Build a JSON response with CORS headers */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/** Build an HTML response */
function htmlResponse(html) {
  return new Response(html, {
    headers: { "Content-Type": "text/html;charset=UTF-8" },
  });
}

// ── CRUD handlers ─────────────────────────────────────────────────

/** POST /api/tasks */
async function createTask(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { title, priority, status } = body;
  if (!title || !priority || !status) {
    return jsonResponse(
      { error: "title, priority, and status are required" },
      400
    );
  }

  const id = generateId();
  const task = {
    id,
    title,
    priority,
    status,
    createdAt: new Date().toISOString(),
  };

  await env.TASKS_KV.put(id, JSON.stringify(task));
  return jsonResponse({ message: "Task created successfully", task }, 201);
}

/** GET /api/tasks */
async function listTasks(env) {
  const list = await env.TASKS_KV.list();
  const tasks = await Promise.all(
    list.keys.map(async ({ name }) => {
      const raw = await env.TASKS_KV.get(name);
      return raw ? JSON.parse(raw) : null;
    })
  );
  return jsonResponse(tasks.filter(Boolean));
}

/** GET /api/tasks/:id */
async function getTask(id, env) {
  const raw = await env.TASKS_KV.get(id);
  if (!raw) return jsonResponse({ error: "Task not found" }, 404);
  return jsonResponse(JSON.parse(raw));
}

/** PUT /api/tasks/:id */
async function updateTask(id, request, env) {
  const raw = await env.TASKS_KV.get(id);
  if (!raw) return jsonResponse({ error: "Task not found" }, 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const existing = JSON.parse(raw);
  const updated = {
    ...existing,
    title: body.title ?? existing.title,
    priority: body.priority ?? existing.priority,
    status: body.status ?? existing.status,
    updatedAt: new Date().toISOString(),
  };

  await env.TASKS_KV.put(id, JSON.stringify(updated));
  return jsonResponse({ message: "Task updated successfully", task: updated });
}

/** DELETE /api/tasks/:id */
async function deleteTask(id, env) {
  const raw = await env.TASKS_KV.get(id);
  if (!raw) return jsonResponse({ error: "Task not found" }, 404);

  await env.TASKS_KV.delete(id);
  return jsonResponse({ message: "Task deleted successfully" });
}

// ── Frontend HTML (served at GET /) ──────────────────────────────

function frontendHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cloud-Based Student Task Manager</title>
  <style>
    /* ── Reset & base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 24px 16px;
    }
    h1 { text-align: center; color: #fff; font-size: 2rem; margin-bottom: 8px; }
    .subtitle { text-align: center; color: rgba(255,255,255,.8); margin-bottom: 32px; font-size: .95rem; }

    /* ── Card ── */
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 24px;
      max-width: 860px;
      margin: 0 auto 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,.18);
    }
    .card h2 { font-size: 1.1rem; color: #4a4a6a; margin-bottom: 16px; border-bottom: 2px solid #eee; padding-bottom: 8px; }

    /* ── Form ── */
    .form-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .form-group { flex: 1; min-width: 160px; display: flex; flex-direction: column; gap: 4px; }
    label { font-size: .82rem; font-weight: 600; color: #555; }
    input, select {
      padding: 9px 12px;
      border: 1.5px solid #ddd;
      border-radius: 8px;
      font-size: .9rem;
      outline: none;
      transition: border-color .2s;
    }
    input:focus, select:focus { border-color: #667eea; }
    .btn {
      padding: 10px 22px;
      border: none;
      border-radius: 8px;
      font-size: .9rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity .2s, transform .1s;
    }
    .btn:active { transform: scale(.97); }
    .btn-primary { background: #667eea; color: #fff; }
    .btn-primary:hover { opacity: .88; }
    .btn-row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }

    /* ── Task table ── */
    table { width: 100%; border-collapse: collapse; font-size: .88rem; }
    th { background: #f4f5fb; color: #555; font-weight: 700; text-align: left; padding: 10px 12px; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; color: #333; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #f9f9ff; }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: .78rem;
      font-weight: 700;
    }
    .badge-High    { background: #ffe0e0; color: #c0392b; }
    .badge-Medium  { background: #fff3cd; color: #856404; }
    .badge-Low     { background: #d4edda; color: #155724; }
    .badge-Pending    { background: #cfe2ff; color: #084298; }
    .badge-Completed  { background: #d1e7dd; color: #0f5132; }
    .badge-InProgress { background: #fff3cd; color: #664d03; }

    .action-btn {
      border: none;
      border-radius: 6px;
      padding: 5px 10px;
      cursor: pointer;
      font-size: .78rem;
      font-weight: 600;
      margin-right: 4px;
      transition: opacity .2s;
    }
    .action-btn:hover { opacity: .8; }
    .btn-complete { background: #d1e7dd; color: #0f5132; }
    .btn-delete   { background: #f8d7da; color: #842029; }

    /* ── Toast ── */
    #toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #333;
      color: #fff;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: .88rem;
      opacity: 0;
      transition: opacity .4s;
      z-index: 999;
    }
    #toast.show { opacity: 1; }

    /* ── Empty state ── */
    .empty { text-align: center; color: #aaa; padding: 32px 0; font-size: .95rem; }
  </style>
</head>
<body>
  <h1>🎓 Cloud-Based Student Task Manager</h1>
  <p class="subtitle">Powered by Cloudflare Workers &amp; Workers KV · Deployed via Terraform</p>

  <!-- Add Task Form -->
  <div class="card">
    <h2>➕ Add New Task</h2>
    <div class="form-row">
      <div class="form-group" style="flex:3">
        <label for="taskTitle">Task Title</label>
        <input id="taskTitle" type="text" placeholder="e.g. Submit Cloud Computing Assignment" />
      </div>
      <div class="form-group">
        <label for="taskPriority">Priority</label>
        <select id="taskPriority">
          <option value="High">High</option>
          <option value="Medium" selected>Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>
      <div class="form-group">
        <label for="taskStatus">Status</label>
        <select id="taskStatus">
          <option value="Pending" selected>Pending</option>
          <option value="InProgress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
    </div>
    <div class="btn-row" style="margin-top:16px">
      <button class="btn btn-primary" onclick="addTask()">Add Task</button>
      <button class="btn" style="background:#f4f5fb;color:#555" onclick="loadTasks()">🔄 Refresh</button>
    </div>
  </div>

  <!-- Task List -->
  <div class="card">
    <h2>📋 Task List</h2>
    <div id="taskTableContainer">
      <div class="empty">Loading tasks…</div>
    </div>
  </div>

  <div id="toast"></div>

  <script>
    const API = "/api/tasks";

    function toast(msg, color = "#333") {
      const el = document.getElementById("toast");
      el.textContent = msg;
      el.style.background = color;
      el.classList.add("show");
      setTimeout(() => el.classList.remove("show"), 3000);
    }

    async function loadTasks() {
      const container = document.getElementById("taskTableContainer");
      try {
        const res = await fetch(API);
        const tasks = await res.json();
        if (!Array.isArray(tasks) || tasks.length === 0) {
          container.innerHTML = '<div class="empty">No tasks yet. Add your first task above!</div>';
          return;
        }
        // Sort: Pending first, then by ID
        tasks.sort((a, b) => {
          const order = { Pending: 0, InProgress: 1, Completed: 2 };
          return (order[a.status] ?? 3) - (order[b.status] ?? 3);
        });
        container.innerHTML = \`
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Task Title</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              \${tasks.map(t => \`
                <tr>
                  <td><strong>\${t.id}</strong></td>
                  <td>\${t.title}</td>
                  <td><span class="badge badge-\${t.priority}">\${t.priority}</span></td>
                  <td><span class="badge badge-\${t.status}">\${t.status}</span></td>
                  <td>\${t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    \${t.status !== 'Completed' ? \`<button class="action-btn btn-complete" onclick="completeTask('\${t.id}')">✓ Complete</button>\` : ''}
                    <button class="action-btn btn-delete" onclick="deleteTask('\${t.id}')">✕ Delete</button>
                  </td>
                </tr>\`).join('')}
            </tbody>
          </table>\`;
      } catch (err) {
        container.innerHTML = '<div class="empty">❌ Failed to load tasks.</div>';
      }
    }

    async function addTask() {
      const title    = document.getElementById("taskTitle").value.trim();
      const priority = document.getElementById("taskPriority").value;
      const status   = document.getElementById("taskStatus").value;
      if (!title) { toast("Please enter a task title.", "#c0392b"); return; }

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority, status }),
      });
      const data = await res.json();
      if (res.ok) {
        document.getElementById("taskTitle").value = "";
        toast("✅ Task created: " + data.task.id, "#0f5132");
        loadTasks();
      } else {
        toast("❌ " + (data.error || "Failed to create task"), "#c0392b");
      }
    }

    async function completeTask(id) {
      const res = await fetch(\`\${API}/\${id}\`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" }),
      });
      const data = await res.json();
      if (res.ok) { toast("✅ Task marked as Completed", "#0f5132"); loadTasks(); }
      else toast("❌ " + (data.error || "Failed to update"), "#c0392b");
    }

    async function deleteTask(id) {
      if (!confirm("Delete task " + id + "?")) return;
      const res = await fetch(\`\${API}/\${id}\`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) { toast("🗑️ Task deleted", "#555"); loadTasks(); }
      else toast("❌ " + (data.error || "Failed to delete"), "#c0392b");
    }

    // Load on page open
    loadTasks();
  </script>
</body>
</html>`;
}

// ── Main router (Service Worker format for Cloudflare Terraform provider v4) ─

async function handleRequest(request) {
  // env is exposed as TASKS_KV global binding in service worker format
  const env = { TASKS_KV };
  const url = new URL(request.url);
  const { pathname, method } = url;
  const path = pathname.replace(/\/+$/, "") || "/";

  // CORS pre-flight
  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // ── Serve frontend ─────────────────────────────────────────────
  if (method === "GET" && (path === "/" || path === "/index.html")) {
    return htmlResponse(frontendHtml());
  }

  // ── API routes ─────────────────────────────────────────────────
  if (path === "/api/tasks") {
    if (method === "POST") return createTask(request, env);
    if (method === "GET")  return listTasks(env);
  }

  const taskMatch = path.match(/^\/api\/tasks\/(.+)$/);
  if (taskMatch) {
    const id = taskMatch[1];
    if (method === "GET")    return getTask(id, env);
    if (method === "PUT")    return updateTask(id, request, env);
    if (method === "DELETE") return deleteTask(id, env);
  }

  return jsonResponse({ error: "Not found" }, 404);
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
