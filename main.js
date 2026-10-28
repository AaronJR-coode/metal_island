  const $ = (s) => document.querySelector(s);
      const today = () => new Date().toISOString().slice(0, 10);
      const fmt = (n) =>
        new Intl.NumberFormat("en-MW", {
          style: "currency",
          currency: state.settings.currency || "MWK",
          maximumFractionDigits: 2,
        }).format(Number(n) || 0);
      const safe = (s) =>
        String(s ?? "").replace(
          /[&<>"']/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[c],
        );
      const seed = {
        settings: {
          name: "Metal Island",
          email: "kamphonjechiyambiesau@gmail.com",
          phone: "0990454283, 0886845180",
          address: "Lilongwe, Lumbadzi",
          tax: 0,
          currency: "MWK",
          logo: "images/metal_island.jpg",
          prefixQuote: "QUO",
          prefixInvoice: "INV",
        },
        clients: [],
        docs: [],
        records: [],
      };
      let state;
      try {
        state =
          JSON.parse(localStorage.getItem("metalisland-v1")) ||
          structuredClone(seed);
      } catch {
        state = structuredClone(seed);
      }
      let page = "dashboard",
        editingId = null,
        viewId = null,
        items = [];
      function save() {
        localStorage.setItem("metalisland-v1", JSON.stringify(state));
      }
      
      if (!state.settings.logo) {
        state.settings.logo = "images/metal_island.jpg";
        save();
      }

      function toast(msg) {
        let t = $("#toast");
        t.textContent = msg;
        t.style.display = "block";
        setTimeout(() => (t.style.display = "none"), 2400);
      }
      function money(n) {
        return fmt(n);
      }
      function total(doc) {
        let subtotal = (doc.items || []).reduce(
          (s, x) => s + (Number(x.qty) || 0) * (Number(x.price) || 0),
          0,
        );
        return {
          subtotal,
          tax: (subtotal * (Number(doc.taxRate) || 0)) / 100,
          total: subtotal * (1 + (Number(doc.taxRate) || 0) / 100),
        };
      }
      function docNumber(type) {
        let prefix =
          type === "Quote"
            ? state.settings.prefixQuote
            : state.settings.prefixInvoice;
        let count = state.docs.filter((d) => d.type === type).length + 1;
        return `${prefix || type.slice(0, 3).toUpperCase()}-${String(count).padStart(4, "0")}`;
      }
      function go(p) {
        page = p;
        document
          .querySelectorAll("#nav button")
          .forEach((b) => b.classList.toggle("active", b.dataset.page === p));
        $("#topTitle").textContent = {
          dashboard: "Dashboard",
          documents: "Quotes & Invoices",
          clients: "Clients",
          records: "Business records",
          settings: "Business settings",
        }[p];
        $("#todayText").textContent = new Date().toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        render();
      }
      $("#nav").addEventListener("click", (e) => {
        let b = e.target.closest("button[data-page]");
        if (b) go(b.dataset.page);
      });
      $("#newDocTop").onclick = () => openDoc();
      function render() {
        let c = $("#content");
        if (page === "dashboard") renderDashboard(c);
        if (page === "documents") renderDocuments(c);
        if (page === "clients") renderClients(c);
        if (page === "records") renderRecords(c);
        if (page === "settings") renderSettings(c);
      }
      function renderDashboard(c) {
        let invoices = state.docs.filter((d) => d.type === "Invoice"),
          quotes = state.docs.filter((d) => d.type === "Quote");
        let paid = invoices
          .filter((d) => d.status === "Paid")
          .reduce((s, d) => s + total(d).total, 0);
        let due = invoices
          .filter((d) => !["Paid", "Draft"].includes(d.status))
          .reduce((s, d) => s + total(d).total, 0);
        let outstanding = quotes.filter((d) =>
          ["Sent", "Pending"].includes(d.status),
        ).length;
        c.innerHTML = `<div class="pagehead"><div><h2>Welcome back</h2><p>Here’s what’s happening with your business.</p></div><div class="actions"><button class="secondary" onclick="openDoc('Quote')">＋ New quote</button><button class="primary" onclick="openDoc('Invoice')">＋ New invoice</button></div></div>
<div class="stats">
<div class="stat"><div class="stat-top">Revenue received <span class="stat-icon">↗</span></div><strong>${money(paid)}</strong><small>Invoices marked paid</small></div>
<div class="stat"><div class="stat-top">Outstanding invoices <span class="stat-icon">◷</span></div><strong>${money(due)}</strong><small>Sent or pending payment</small></div>
<div class="stat"><div class="stat-top">Quotes awaiting <span class="stat-icon">▤</span></div><strong>${outstanding}</strong><small>Sent / pending quotes</small></div>
<div class="stat"><div class="stat-top">Clients <span class="stat-icon">♙</span></div><strong>${state.clients.length}</strong><small>Saved client records</small></div></div>
<div class="grid2"><section class="panel"><div class="panel-head"><h3>Recent documents</h3><button class="secondary small" onclick="go('documents')">View all</button></div>${docTable(
          state.docs
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 6),
        )}</section>
<section class="panel"><h3>Quick actions</h3><div class="quicklinks"><button onclick="openDoc('Quote')">＋ Create a quote<span>Price a job or service</span></button><button onclick="openDoc('Invoice')">＋ Create an invoice<span>Bill a client</span></button><button onclick="openClient()">♙ Add a client<span>Save contact details</span></button><button onclick="go('records')">▣ Add a record<span>Track business activity</span></button></div><div style="margin-top:22px"><h3>Getting started</h3><p class="muted" style="font-size:13px;margin:0">Add your business details in settings, save clients, then create quotes or invoices. Use the Print button to print or save a document as PDF.</p></div></section></div>`;
      }
      function docTable(docs) {
        if (!docs.length)
          return `<div class="empty"><strong>No documents yet</strong>Create a quote or invoice to see it here.</div>`;
        return `<div class="table-wrap"><table><thead><tr><th>Document</th><th>Client</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${docs.map((d) => `<tr><td><strong>${safe(d.number)}</strong><br><span class="muted">${d.type}</span></td><td>${safe(clientName(d.clientId) || d.clientName || "—")}</td><td>${safe(d.date)}</td><td><strong>${money(total(d).total)}</strong></td><td><span class="badge ${safe(d.status)}">${safe(d.status)}</span></td><td><button class="secondary small" onclick="viewDoc('${d.id}')">Open</button></td></tr>`).join("")}</tbody></table></div>`;
      }
      function renderDocuments(c) {
        c.innerHTML = `<div class="pagehead"><div><h2>Quotes & invoices</h2><p>Create, manage and print your business documents.</p></div><div class="actions"><button class="secondary" onclick="openDoc('Quote')">＋ New quote</button><button class="primary" onclick="openDoc('Invoice')">＋ New invoice</button></div></div><div class="panel"><div class="searchrow"><input id="docSearch" placeholder="Search number or client…"><select id="docType"><option value="">All types</option><option>Quote</option><option>Invoice</option></select><select id="docStatus"><option value="">All statuses</option>${["Draft", "Sent", "Pending", "Paid", "Overdue", "Accepted", "Rejected"].map((s) => `<option>${s}</option>`).join("")}</select></div><div id="docList">${docTable(state.docs)}</div></div>`;
        ["docSearch", "docType", "docStatus"].forEach((id) =>
          $("#" + id).addEventListener("input", filterDocs),
        );
      }
      function filterDocs() {
        let q = $("#docSearch").value.toLowerCase(),
          t = $("#docType").value,
          s = $("#docStatus").value;
        let docs = state.docs.filter(
          (d) =>
            (!t || d.type === t) &&
            (!s || d.status === s) &&
            `${d.number} ${clientName(d.clientId) || d.clientName || ""}`
              .toLowerCase()
              .includes(q),
        );
        $("#docList").innerHTML = docTable(docs);
      }
      function clientName(id) {
        return state.clients.find((x) => x.id === id)?.name || "";
      }
      function renderClients(c) {
        c.innerHTML = `<div class="pagehead"><div><h2>Clients</h2><p>Keep customer contacts in one place.</p></div><button class="primary" onclick="openClient()">＋ Add client</button></div><div class="panel"><div class="searchrow"><input id="clientSearch" placeholder="Search clients…"></div><div id="clientList">${clientTable(state.clients)}</div></div>`;
        $("#clientSearch").oninput = () =>
          ($("#clientList").innerHTML = clientTable(
            state.clients.filter((x) =>
              (x.name + " " + x.email + " " + x.phone + " " + x.company)
                .toLowerCase()
                .includes($("#clientSearch").value.toLowerCase()),
            ),
          ));
      }
      function clientTable(clients) {
        if (!clients.length)
          return `<div class="empty"><strong>No clients saved</strong>Add a client to quickly use their details on documents.</div>`;
        return `<div class="table-wrap"><table><thead><tr><th>Name / company</th><th>Email</th><th>Phone</th><th>Documents</th><th></th></tr></thead><tbody>${clients.map((x) => `<tr><td><strong>${safe(x.name)}</strong><br><span class="muted">${safe(x.company || "")}</span></td><td>${safe(x.email || "—")}</td><td>${safe(x.phone || "—")}</td><td>${state.docs.filter((d) => d.clientId === x.id).length}</td><td><button class="secondary small" onclick="editClient('${x.id}')">Edit</button> <button class="danger small" onclick="deleteClient('${x.id}')">Delete</button></td></tr>`).join("")}</tbody></table></div>`;
      }
      function openClient(id) {
        let x = state.clients.find((c) => c.id === id) || {};
        $("#viewBackdrop").classList.remove("show");
        $("#docBackdrop").classList.add("show");
        $("#docModal").innerHTML =
          `<div class="modal-head"><h2>${id ? "Edit client" : "Add client"}</h2><button class="secondary small" onclick="closeDoc()">✕</button></div><form id="clientForm"><div class="formgrid"><div class="field"><label>Client name *</label><input name="name" required value="${safe(x.name || "")}" placeholder="Full name"></div><div class="field"><label>Company</label><input name="company" value="${safe(x.company || "")}" placeholder="Company name"></div><div class="field"><label>Email</label><input name="email" type="email" value="${safe(x.email || "")}"></div><div class="field"><label>Phone</label><input name="phone" value="${safe(x.phone || "")}"></div><div class="field full"><label>Address</label><textarea name="address">${safe(x.address || "")}</textarea></div><div class="field full"><label>Notes</label><textarea name="notes">${safe(x.notes || "")}</textarea></div></div><div class="modal-foot"><span class="muted">Client details are saved locally.</span><div class="right"><button type="button" class="secondary" onclick="closeDoc()">Cancel</button><button class="primary">Save client</button></div></div></form>`;
        $("#clientForm").onsubmit = (e) => {
          e.preventDefault();
          let f = new FormData(e.target),
            obj = Object.fromEntries(f.entries());
          obj.id = id || crypto.randomUUID();
          if (id)
            state.clients = state.clients.map((a) => (a.id === id ? obj : a));
          else state.clients.push(obj);
          save();
          closeDoc();
          render();
          toast("Client saved");
        };
      }
      function editClient(id) {
        openClient(id);
      }
      function deleteClient(id) {
        if (!confirm("Delete this client? Existing documents will remain."))
          return;
        state.clients = state.clients.filter((x) => x.id !== id);
        save();
        render();
        toast("Client deleted");
      }
      function openDoc(type = "Quote", id = null) {
        editingId = id;
        let old = state.docs.find((d) => d.id === id);
        let d = old
          ? JSON.parse(JSON.stringify(old))
          : {
              id: crypto.randomUUID(),
              type,
              number: docNumber(type),
              clientId: "",
              clientName: "",
              date: today(),
              dueDate: "",
              status: "Draft",
              taxRate: Number(state.settings.tax) || 0,
              notes: "",
              items: [{ description: "", qty: 1, price: 0 }],
              createdAt: new Date().toISOString(),
            };
        items = d.items || [];
        if (!items.length) items = [{ description: "", qty: 1, price: 0 }];
        $("#docBackdrop").classList.add("show");
        $("#docModal").innerHTML =
          `<div class="modal-head"><div><h2>${id ? "Edit" : "Create"} ${d.type}</h2><div class="muted" style="font-size:13px">${safe(d.number)}</div></div><button class="secondary small" onclick="closeDoc()">✕</button></div>
<form id="docForm"><div class="formgrid">
<div class="field"><label>Document type *</label><select name="type" id="fType"><option ${d.type === "Quote" ? "selected" : ""}>Quote</option><option ${d.type === "Invoice" ? "selected" : ""}>Invoice</option></select></div>
<div class="field"><label>Status</label><select name="status">${["Draft", "Sent", "Pending", "Paid", "Overdue", "Accepted", "Rejected"].map((s) => `<option ${d.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
<div class="field"><label>Client *</label><select name="clientId" id="fClient" required><option value="">Choose a client…</option>${state.clients.map((x) => `<option value="${x.id}" ${d.clientId === x.id ? "selected" : ""}>${safe(x.name)}${x.company ? " — " + safe(x.company) : ""}</option>`).join("")}<option value="__new">＋ Add new client…</option></select></div>
<div class="field"><label>Document number</label><input name="number" required value="${safe(d.number)}"></div>
<div class="field"><label>Issue date *</label><input name="date" type="date" required value="${safe(d.date)}"></div>
<div class="field"><label>Due date / valid until</label><input name="dueDate" type="date" value="${safe(d.dueDate || "")}"></div>
</div><div class="panel" style="padding:14px;margin:4px 0 15px"><div class="panel-head"><h3>Items and services</h3><button type="button" class="secondary small" onclick="addItem()">＋ Add line</button></div><div class="line-items"><table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th><th></th></tr></thead><tbody id="itemRows"></tbody></table></div><div class="formgrid"><div class="field"><label>Tax rate (%)</label><input id="fTax" name="taxRate" type="number" min="0" step="0.01" value="${Number(d.taxRate) || 0}"></div><div class="field"><label>Currency</label><input value="${safe(state.settings.currency)}" disabled></div></div><div class="totals" id="totals"></div></div>
<div class="field">
  <label>Job Description</label>
  <textarea
    name="jobDescription"
    rows="4"
    placeholder="Describe the work to be carried out..."
  >${safe(d.jobDescription || "")}</textarea>
</div>

<div class="field">
  <label>Notes / payment terms</label>
  <textarea name="notes">${safe(d.notes || "")}</textarea>
</div><div class="modal-foot"><span class="muted">Use Print / PDF after saving to share a copy.</span><div class="right"><button type="button" class="secondary" onclick="closeDoc()">Cancel</button><button class="primary">Save ${d.type}</button></div></div></form>`;
        renderItems();
        $("#fTax").oninput = renderItems;
        $("#fClient").onchange = (e) => {
          if (e.target.value === "__new") {
            openClient();
            return;
          }
          let cl = state.clients.find((x) => x.id === e.target.value);
          if (cl) $("#docForm").dataset.clientName = cl.name;
        };
        $("#fType").onchange = (e) => {
          let typ = e.target.value;
          if (!id) {
            $("#docModal .modal-head h2").textContent = "Create " + typ;
            $("#docModal .modal-head .muted").textContent = docNumber(typ);
            $("#docForm [name=number]").value = docNumber(typ);
          }
        };
        $("#docForm").onsubmit = (e) => {
          e.preventDefault();
          let obj = Object.fromEntries(new FormData(e.target).entries());
          obj.id = id || d.id;
          obj.clientName = clientName(obj.clientId) || d.clientName || "";
          obj.taxRate = Number(obj.taxRate) || 0;
          obj.items = items.map((i) => ({
            description: i.description,
            qty: Number(i.qty) || 0,
            price: Number(i.price) || 0,
          }));
          obj.createdAt = d.createdAt || new Date().toISOString();
          if (id) state.docs = state.docs.map((a) => (a.id === id ? obj : a));
          else state.docs.unshift(obj);
          save();
          closeDoc();
          render();
          toast("Document saved");
        };
      }
      function addItem() {
        items.push({ description: "", qty: 1, price: 0 });
        renderItems();
      }
      function renderItems() {
        let tbody = $("#itemRows");
        if (!tbody) return;
        tbody.innerHTML = items
          .map(
            (it, i) =>
              `<tr><td><input class="desc" aria-label="Description" value="${safe(it.description)}" placeholder="Service or product" oninput="items[${i}].description=this.value"></td><td><input aria-label="Quantity" type="number" min="0" step="0.01" value="${it.qty}" oninput="items[${i}].qty=this.value;updateTotals()"></td><td><input aria-label="Unit price" type="number" min="0" step="0.01" value="${it.price}" oninput="items[${i}].price=this.value;updateTotals()"></td><td id="line${i}">${money((Number(it.qty) || 0) * (Number(it.price) || 0))}</td><td><button type="button" class="danger small" onclick="removeItem(${i})" aria-label="Remove line">×</button></td></tr>`,
          )
          .join("");
        updateTotals();
      }
      function removeItem(i) {
        items.splice(i, 1);
        if (!items.length) items.push({ description: "", qty: 1, price: 0 });
        renderItems();
      }
      function updateTotals() {
        let sub = items.reduce(
            (s, x) => s + (Number(x.qty) || 0) * (Number(x.price) || 0),
            0,
          ),
          tax = (sub * (Number($("#fTax")?.value) || 0)) / 100;
        items.forEach((x, i) => {
          let el = $("#line" + i);
          if (el)
            el.textContent = money(
              (Number(x.qty) || 0) * (Number(x.price) || 0),
            );
        });
        let t = $("#totals");
        if (t)
          t.innerHTML = `<div class="totalrow"><span>Subtotal</span><strong>${money(sub)}</strong></div><div class="totalrow"><span>Tax (${Number($("#fTax")?.value) || 0}%)</span><strong>${money(tax)}</strong></div><div class="totalrow grand"><span>Total</span><strong>${money(sub + tax)}</strong></div>`;
      }
      function closeDoc() {
        $("#docBackdrop").classList.remove("show");
        editingId = null;
      }

      function viewDoc(id) {
        viewId = id;
        let d = state.docs.find((x) => x.id === id);
        if (!d) return;
        let cl = state.clients.find((x) => x.id === d.clientId) || {};
        let t = total(d);
        $("#viewBackdrop").classList.add("show");
        $("#viewModal").innerHTML =
          `<div class="modal-head no-print"><div><h2>${safe(d.type)} ${safe(d.number)}</h2>
          <div class="muted">Created ${safe(d.date)}</div></div><button class="secondary small" onclick="closeView()">✕</button></div>
          <div class="print-document"><div style="display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;border-bottom:2px solid #1d4ed8;padding-bottom:22px;margin-bottom:25px">
          <div style="display:flex;align-items:flex-start;gap:16px;min-width:0">${state.settings.logo ? `<img src="${state.settings.logo}" alt="Business logo" style="width:100px;height:100px;object-fit:contain;flex-shrink:0">` : ``}
          <div><h1 style="font-size:27px;margin:0 0 8px">${safe(state.settings.name || "Your Business")}</h1>
          <div class="muted">${safe(state.settings.address || "").replace(/\n/g, "<br>")}</div>
          <div class="muted">${safe(state.settings.email || "")} ${state.settings.phone ? " · " + safe(state.settings.phone) : ""}</div></div></div>
          <div style="text-align:right"><div style="font-size:27px;font-weight:800;color:#1d4ed8">${safe(d.type.toUpperCase())}</div>
          <strong>${safe(d.number)}</strong><div class="muted">Date: ${safe(d.date)}</div>${d.dueDate ? `<div class="muted">Due / valid until: ${safe(d.dueDate)}</div>` : ""}<div style="margin-top:7px"><span class="badge ${safe(d.status)}">${safe(d.status)}</span></div></div></div>
          <div style="margin-bottom:28px"><div class="muted" style="font-size:12px;text-transform:uppercase;font-weight:700;letter-spacing:.6px">Bill to</div><h3 style="margin:5px 0">${safe(cl.name || d.clientName || "Client")}</h3>${cl.company ? `<div>${safe(cl.company)}</div>` : ""}<div class="muted">${safe(cl.address || "")}</div><div class="muted">${safe(cl.email || "")} ${cl.phone ? " · " + safe(cl.phone) : ""}</div></div>
          ${d.jobDescription ? `
          <div style="margin:0 0 22px">
            <strong>Job Description</strong>
            <p style="white-space:pre-line;color:#475569;margin:6px 0 0">
              ${safe(d.jobDescription)}
            </p>
          </div>` : ""
        }
        <div class="table-wrap"><table><thead><tr><th>Description</th>
        <th>Qty</th><th>Unit price</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>${d.items.map((i) => `<tr><td>${safe(i.description)}</td><td>${Number(i.qty) || 0}</td><td>${money(i.price)}</td><td style="text-align:right">${money((Number(i.qty) || 0) * (Number(i.price) || 0))}</td></tr>`).join("")}</tbody></table></div>
<div class="totals" style="margin-top:18px"><div class="totalrow"><span>Subtotal</span><strong>${money(t.subtotal)}</strong></div><div class="totalrow"><span>Tax (${Number(d.taxRate) || 0}%)</span><strong>${money(t.tax)}</strong></div><div class="totalrow grand"><span>Total due</span><strong>${money(t.total)}</strong></div></div>
${d.notes ? `<div style="margin-top:35px;padding-top:16px;border-top:1px solid #e2e8f0"><strong>Notes / terms</strong><p style="white-space:pre-line;color:#475569">${safe(d.notes)}</p></div>` : ""}
<div style="text-align:center;color:#64748b;font-size:12px;margin-top:35px">Thank you for your business.</div></div>
<div class="modal-foot no-print"><div class="actions"><button class="secondary" onclick="editDoc('${d.id}')">Edit</button><button class="secondary" onclick="printDoc()">Print / Save PDF</button></div><div class="right"><button class="secondary" onclick="convertDoc('${d.id}')">${d.type === "Quote" ? "Convert to invoice" : "Duplicate"}</button><button class="primary" onclick="changeStatus('${d.id}')">Update status</button></div></div>`;
      }
      function closeView() {
        $("#viewBackdrop").classList.remove("show");
        viewId = null;
      }
      function editDoc(id) {
        closeView();
        openDoc(null, id);
      }
      function printDoc() {
        window.print();
      }
      function convertDoc(id) {
        let d = state.docs.find((x) => x.id === id);
        if (!d) return;
        if (d.type === "Quote") {
          let n = JSON.parse(JSON.stringify(d));
          n.id = crypto.randomUUID();
          n.type = "Invoice";
          n.number = docNumber("Invoice");
          n.status = "Draft";
          n.date = today();
          n.createdAt = new Date().toISOString();
          state.docs.unshift(n);
          save();
          closeView();
          render();
          viewDoc(n.id);
          toast("Invoice created from quote");
        } else {
          let n = JSON.parse(JSON.stringify(d));
          n.id = crypto.randomUUID();
          n.number = docNumber("Invoice");
          n.status = "Draft";
          n.date = today();
          n.createdAt = new Date().toISOString();
          state.docs.unshift(n);
          save();
          closeView();
          render();
          viewDoc(n.id);
          toast("Invoice duplicated");
        }
      }
      function changeStatus(id) {
        let d = state.docs.find((x) => x.id === id);
        if (!d) return;
        let s = prompt(
          "Enter status: Draft, Sent, Pending, Paid, Overdue, Accepted or Rejected",
          d.status,
        );
        if (!s) return;
        s = s.trim();
        let allowed = [
          "Draft",
          "Sent",
          "Pending",
          "Paid",
          "Overdue",
          "Accepted",
          "Rejected",
        ];
        let v = allowed.find((x) => x.toLowerCase() === s.toLowerCase());
        if (!v) {
          toast("Status not recognised");
          return;
        }
        d.status = v;
        save();
        viewDoc(id);
        render();
        toast("Status updated");
      }
      function renderRecords(c) {
        let rec = state.records || [];
        c.innerHTML = `<div class="pagehead"><div><h2>Business records</h2><p>Track expenses, payments and other important activity.</p></div><button class="primary" onclick="openRecord()">＋ Add record</button></div><div class="stats"><div class="stat"><div class="stat-top">Records saved</div><strong>${rec.length}</strong><small>All record types</small></div><div class="stat"><div class="stat-top">Expenses logged</div><strong>${money(rec.filter((x) => x.type === "Expense").reduce((s, x) => s + Number(x.amount || 0), 0))}</strong><small>Recorded expenses</small></div><div class="stat"><div class="stat-top">Other income logged</div><strong>${money(rec.filter((x) => x.type === "Income").reduce((s, x) => s + Number(x.amount || 0), 0))}</strong><small>Income not tied to an invoice</small></div></div><div class="panel"><div class="panel-head"><h3>Record history</h3><span class="muted">${rec.length} entries</span></div>${
          rec.length
            ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Category</th><th>Amount</th><th></th></tr></thead><tbody>${rec
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(
                  (x) =>
                    `<tr><td>${safe(x.date)}</td><td><span class="badge">${safe(x.type)}</span></td><td>${safe(x.description)}</td><td>${safe(x.category || "—")}</td><td><strong>${money(x.amount)}</strong></td><td><button class="danger small" onclick="deleteRecord('${x.id}')">Delete</button></td></tr>`,
                )
                .join("")}</tbody></table></div>`
            : `<div class="empty"><strong>No records yet</strong>Add expenses, income or general notes to keep your business history organised.</div>`
        }</div>`;
      }
      function openRecord() {
        let d = $("#viewBackdrop");
        d.classList.add("show");
        $("#viewModal").innerHTML =
          `<div class="modal-head"><h2>Add business record</h2><button class="secondary small" onclick="closeView()">✕</button></div><form id="recordForm"><div class="formgrid"><div class="field"><label>Record type *</label><select name="type"><option>Expense</option><option>Income</option><option>Note</option></select></div><div class="field"><label>Date *</label><input name="date" type="date" value="${today()}" required></div><div class="field"><label>Description *</label><input name="description" required placeholder="e.g. Office supplies"></div><div class="field"><label>Category</label><input name="category" placeholder="e.g. Travel, Materials"></div><div class="field"><label>Amount (${safe(state.settings.currency)})</label><input name="amount" type="number" min="0" step="0.01" value="0"></div><div class="field"><label>Reference / notes</label><input name="reference" placeholder="Receipt number, details…"></div></div><div class="modal-foot"><span></span><div class="right"><button type="button" class="secondary" onclick="closeView()">Cancel</button><button class="primary">Save record</button></div></div></form>`;
        $("#recordForm").onsubmit = (e) => {
          e.preventDefault();
          let obj = Object.fromEntries(new FormData(e.target).entries());
          obj.id = crypto.randomUUID();
          obj.amount = Number(obj.amount) || 0;
          state.records.push(obj);
          save();
          closeView();
          render();
          toast("Record saved");
        };
      }
      function deleteRecord(id) {
        if (!confirm("Delete this record?")) return;
        state.records = state.records.filter((x) => x.id !== id);
        save();
        render();
        toast("Record deleted");
      }
      function renderSettings(c) {
        let s = state.settings;
        c.innerHTML = `<div class="pagehead"><div><h2>Business settings</h2><p>These details appear on your printed quotes and invoices.</p></div></div><div class="company-box"><section class="panel"><h3>Business profile</h3><form id="settingsForm"><div class="field"><label>Business name *</label><input name="name" required value="${safe(s.name)}"></div><div class="field"><label>Email</label><input name="email" type="email" value="${safe(s.email)}"></div><div class="field"><label>Phone</label><input name="phone" value="${safe(s.phone)}"></div><div class="field"><label>Business address</label><textarea name="address">${safe(s.address)}</textarea></div><div class="field">
                        <label>Business logo</label><input id="logoUpload" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml">
                        <small class="muted">Upload a PNG, JPG, WebP or SVG logo. It will appear on printed quotations and invoices.</small>
                        <div id="logoPreview" style="display:${s.logo ? "flex" : "none"};align-items:center;gap:12px;margin-top:8px">${s.logo ? `<img src="${s.logo}" alt="Current business logo" style="width:90px;height:70px;object-fit:contain;border:1px solid var(--line);border-radius:8px;padding:5px">` : ``}<button type="button" class="secondary small" id="removeLogo">Remove logo</button></div></div><div class="field"><label>Default tax rate (%)</label><input name="tax" type="number" min="0" step="0.01" value="${Number(s.tax) || 0}"></div><div class="field"><label>Currency code</label><select name="currency">${["MWK", "USD", "ZAR", "GBP", "EUR", "KES", "TZS", "ZMW", "NGN", "INR"].map((x) => `<option ${s.currency === x ? "selected" : ""}>${x}</option>`).join("")}</select><small class="muted">Choose the currency used for new documents.</small></div><button class="primary settings-save">Save business details</button></form></section><section class="panel"><h3>Document numbering</h3><form id="prefixForm"><div class="field"><label>Quote prefix</label><input name="prefixQuote" value="${safe(s.prefixQuote || "QUO")}"></div><div class="field"><label>Invoice prefix</label><input name="prefixInvoice" value="${safe(s.prefixInvoice || "INV")}"></div><button class="primary">Save prefixes</button></form><hr style="border:0;border-top:1px solid var(--line);margin:24px 0"><h3>Data & privacy</h3><p class="muted" style="font-size:13px">Your records are stored in this browser using local storage. They are not automatically backed up or synced to another device. Export a backup regularly.</p><div class="actions"><button class="secondary" onclick="exportData()">Export backup (JSON)</button><button class="secondary" onclick="exportCSV()">Export documents (CSV)</button><label class="secondary" style="display:inline-flex;align-items:center;cursor:pointer"><input id="importFile" type="file" accept=".json,application/json" style="display:none"> Import backup</label></div><p class="muted" style="font-size:12px">Importing a backup replaces current data. Make a backup first.</p><button class="danger" onclick="resetData()">Reset all local data</button></section></div>`;
        $("#settingsForm").onsubmit = (e) => {
          e.preventDefault();
          let o = Object.fromEntries(new FormData(e.target).entries());
          o.tax = Number(o.tax) || 0;
          state.settings = { ...state.settings, ...o };
          save();
          render();
          toast("Business settings saved");
        };
        
        $("#logoUpload").onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (file.size > 1500000) {
            alert("Please choose a logo smaller than 1.5 MB.");
            e.target.value = "";
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            state.settings.logo = reader.result;
            save();
            render();
            toast("Logo saved");
          };
          reader.readAsDataURL(file);
        };
        const removeLogo = $("#removeLogo");
        if (removeLogo)
          removeLogo.onclick = () => {
            delete state.settings.logo;
            save();
            render();
            toast("Logo removed");
          };
        $("#prefixForm").onsubmit = (e) => {
          e.preventDefault();
          Object.assign(
            state.settings,
            Object.fromEntries(new FormData(e.target).entries()),
          );
          save();
          render();
          toast("Prefixes saved");
        };
        $("#importFile").onchange = importData;
      }
      function exportData() {
        download(
          "metalisland-backup.json",
          JSON.stringify(state, null, 2),
          "application/json",
        );
        toast("Backup exported");
      }
      function exportCSV() {
        let rows = [
          [
            "Type",
            "Number",
            "Client",
            "Issue date",
            "Due date",
            "Status",
            "Subtotal",
            "Tax",
            "Total",
            "Notes",
          ],
          ...state.docs.map((d) => {
            let t = total(d);
            return [
              d.type,
              d.number,
              clientName(d.clientId) || d.clientName,
              d.date,
              d.dueDate,
              d.status,
              t.subtotal,
              t.tax,
              t.total,
              d.notes,
            ];
          }),
        ];
        let csv = rows
          .map((r) =>
            r
              .map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"')
              .join(","),
          )
          .join("\r\n");
        download("metalisland-documents.csv", csv, "text/csv;charset=utf-8;");
        toast("CSV exported");
      }
      function download(name, data, type) {
        let a = document.createElement("a"),
          url = URL.createObjectURL(new Blob([data], { type }));
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      }
      function importData(e) {
        let f = e.target.files[0];
        if (!f) return;
        let r = new FileReader();
        r.onload = () => {
          try {
            let d = JSON.parse(r.result);
            if (
              !d.settings ||
              !Array.isArray(d.clients) ||
              !Array.isArray(d.docs)
            )
              throw Error();
            if (
              !confirm(
                "This will replace all current MetalIsland data. Continue?",
              )
            )
              return;
            state = {
              ...structuredClone(seed),
              ...d,
              records: Array.isArray(d.records) ? d.records : [],
            };
            save();
            render();
            toast("Backup imported");
          } catch {
            alert("That file does not look like a valid MetalIsland backup.");
          }
        };
        r.readAsText(f);
        e.target.value = "";
      }
      function resetData() {
        if (
          !confirm(
            "This permanently clears all MetalIsland data saved in this browser. Export a backup first if needed.",
          )
        )
          return;
        state = structuredClone(seed);
        save();
        render();
        toast("Local data reset");
      }
      $("#docBackdrop").addEventListener("click", (e) => {
        if (e.target === $("#docBackdrop")) closeDoc();
      });
      $("#viewBackdrop").addEventListener("click", (e) => {
        if (e.target === $("#viewBackdrop")) closeView();
      });
      go("dashboard");