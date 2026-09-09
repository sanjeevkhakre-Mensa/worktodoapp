/* ============================================================
   WorkFlow — Add / Edit Booking modal (capacity planning)
   ============================================================ */

function openBookingModal(bookingId) {
  const editing = !!bookingId;
  const booking = editing ? Store.getBooking(bookingId) : null;
  const b = booking || {
    userId: currentUserId(),
    projectId: "p1",
    title: "",
    startDate: CapacityState.weekCursor,
    endDate: CapacityState.weekCursor,
    hoursPerDay: 4,
  };

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.id = "bookingModalOverlay";
  overlay.onclick = (e) => { if (e.target === overlay) closeBookingModal(); };

  overlay.innerHTML = `
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-header">
        <h3>${editing ? "Edit Booking" : "Add Booking"}</h3>
        <div class="icon-btn xs" onclick="closeBookingModal()">${icon("x")}</div>
      </div>
      <div class="modal-body">
        <div class="form-field">
          <label>Team Member</label>
          <select id="bk_userId">
            ${getAllUsers().map((u) => `<option value="${u.id}" ${b.userId === u.id ? "selected" : ""}>${escapeHtml(u.name)}</option>`).join("")}
          </select>
        </div>
        <div class="form-field">
          <label>Project</label>
          <select id="bk_projectId">
            ${PROJECTS.map((p) => `<option value="${p.id}" ${b.projectId === p.id ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}
          </select>
        </div>
        <div class="form-field">
          <label>Booking Title</label>
          <input type="text" id="bk_title" placeholder="e.g. Copywriting, Client review" value="${escapeHtml(b.title)}" autofocus />
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label>Start Date</label>
            <input type="date" id="bk_startDate" value="${b.startDate}" />
          </div>
          <div class="form-field">
            <label>End Date</label>
            <input type="date" id="bk_endDate" value="${b.endDate}" />
          </div>
        </div>
        <div class="form-field">
          <label>Hours per day</label>
          <input type="number" id="bk_hoursPerDay" min="0.5" max="24" step="0.5" value="${b.hoursPerDay}" />
        </div>
      </div>
      <div class="modal-footer">
        ${editing ? `<button class="btn btn-danger" style="margin-right:auto" onclick="handleDeleteBooking('${bookingId}')">${icon("trash")} Delete</button>` : ""}
        <button class="btn btn-ghost" onclick="closeBookingModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitBookingModal(${editing ? `'${bookingId}'` : "null"})">${editing ? "Save Changes" : "Add Booking"}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.addEventListener("keydown", bookingModalEscHandler);
  setTimeout(() => document.getElementById("bk_title") && document.getElementById("bk_title").focus(), 30);
}

function bookingModalEscHandler(e) {
  if (e.key === "Escape") closeBookingModal();
}

function closeBookingModal() {
  const overlay = document.getElementById("bookingModalOverlay");
  if (overlay) overlay.remove();
  document.removeEventListener("keydown", bookingModalEscHandler);
}

async function submitBookingModal(bookingId) {
  const title = document.getElementById("bk_title").value.trim();
  if (!title) {
    showToast("Booking title is required", "error");
    document.getElementById("bk_title").focus();
    return;
  }
  const startDate = document.getElementById("bk_startDate").value;
  const endDate = document.getElementById("bk_endDate").value;
  if (!startDate || !endDate) {
    showToast("Start and end date are required", "error");
    return;
  }
  if (endDate < startDate) {
    showToast("End date can't be before start date", "error");
    return;
  }
  const hoursPerDay = Number(document.getElementById("bk_hoursPerDay").value);
  if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
    showToast("Enter a positive number of hours/day", "error");
    return;
  }

  const patch = {
    userId: document.getElementById("bk_userId").value,
    projectId: document.getElementById("bk_projectId").value,
    title,
    startDate,
    endDate,
    hoursPerDay,
  };

  const saveBtn = document.querySelector("#bookingModalOverlay .modal-footer .btn-primary");
  if (saveBtn) saveBtn.disabled = true;

  try {
    if (bookingId) {
      await Store.updateBooking(bookingId, patch);
      showToast("Booking updated", "success");
    } else {
      await Store.addBooking(patch);
      showToast("Booking added", "success");
    }
    closeBookingModal();
    rerenderCurrentPage(true);
  } catch (e) {
    showToast(e.message || "Failed to save booking", "error");
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function handleDeleteBooking(bookingId) {
  if (!confirm("Delete this booking? This cannot be undone.")) return;
  try {
    await Store.deleteBooking(bookingId);
    closeBookingModal();
    showToast("Booking deleted", "success");
    rerenderCurrentPage(true);
  } catch (e) {
    showToast(e.message || "Failed to delete booking", "error");
  }
}
