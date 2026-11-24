import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "nana_invitation_v1";
const emptyState = {
  event: { name: "", type: "Mariage", date: "", place: "", note: "" },
  guests: [],
  tables: [],
  placements: {},
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...emptyState, ...saved } : emptyState;
  } catch {
    return emptyState;
  }
}

function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [activeTab, setActiveTab] = useState("event");
  const [eventForm, setEventForm] = useState(state.event);
  const [guestForm, setGuestForm] = useState({
    name: "", phone: "", group: "", status: "En attente",
  });
  const [tableForm, setTableForm] = useState({ name: "", capacity: "8" });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const eligibleGuests = useMemo(
    () => state.guests.filter((guest) => guest.status !== "Absent"),
    [state.guests]
  );
  const confirmedCount = state.guests.filter((g) => g.status === "Confirmé").length;
  const pendingCount = state.guests.filter((g) => g.status === "En attente").length;
  const seatTotal = state.tables.reduce((sum, table) => sum + table.capacity, 0);
  const placedGuests = eligibleGuests.filter(
    (guest) => state.placements[guest.id] && state.tables.some((t) => t.id === state.placements[guest.id])
  );
  const unplacedGuests = eligibleGuests.filter(
    (guest) => !state.placements[guest.id] || !state.tables.some((t) => t.id === state.placements[guest.id])
  );

  function saveEvent(event) {
    event.preventDefault();
    setState((current) => ({ ...current, event: { ...eventForm } }));
    window.alert("Informations de l’événement enregistrées.");
  }

  function addGuest(event) {
    event.preventDefault();
    if (!guestForm.name.trim()) return;
    const guest = { ...guestForm, id: makeId(), name: guestForm.name.trim() };
    setState((current) => ({ ...current, guests: [...current.guests, guest] }));
    setGuestForm({ name: "", phone: "", group: "", status: "En attente" });
  }

  function removeGuest(id) {
    if (!window.confirm("Supprimer cet invité ?")) return;
    setState((current) => {
      const placements = { ...current.placements };
      delete placements[id];
      return {
        ...current,
        guests: current.guests.filter((guest) => guest.id !== id),
        placements,
      };
    });
  }

  function addTable(event) {
    event.preventDefault();
    const name = tableForm.name.trim();
    const capacity = Number(tableForm.capacity);
    if (!name || !Number.isInteger(capacity) || capacity < 1 || capacity > 100) return;
    if (state.tables.some((table) => table.name.toLowerCase() === name.toLowerCase())) {
      window.alert("Ce nom de table existe déjà.");
      return;
    }
    setState((current) => ({
      ...current,
      tables: [...current.tables, { id: makeId(), name, capacity }],
    }));
    setTableForm({ name: "", capacity: "8" });
  }

  function removeTable(id) {
    if (!window.confirm("Supprimer cette table et libérer ses places ?")) return;
    setState((current) => {
      const placements = Object.fromEntries(
        Object.entries(current.placements).filter(([, tableId]) => tableId !== id)
      );
      return {
        ...current,
        tables: current.tables.filter((table) => table.id !== id),
        placements,
      };
    });
  }

  function isFull(tableId, exceptGuestId = null, placements = state.placements) {
    const table = state.tables.find((item) => item.id === tableId);
    if (!table) return true;
    const occupied = Object.entries(placements).filter(
      ([guestId, assignedTableId]) => assignedTableId === tableId && guestId !== exceptGuestId
    ).length;
    return occupied >= table.capacity;
  }

  function automaticPlacement() {
    if (!state.tables.length) {
      window.alert("Ajoutez d’abord au moins une table.");
      return;
    }
    const nextPlacements = {};
    const ordered = [...eligibleGuests].sort(
      (a, b) => (a.status === "Confirmé" ? 0 : 1) - (b.status === "Confirmé" ? 0 : 1)
    );
    let index = 0;
    ordered.forEach((guest) => {
      let attempts = 0;
      while (
        attempts < state.tables.length &&
        isFull(state.tables[index % state.tables.length].id, null, nextPlacements)
      ) {
        index += 1;
        attempts += 1;
      }
      if (attempts < state.tables.length) {
        const table = state.tables[index % state.tables.length];
        nextPlacements[guest.id] = table.id;
        index += 1;
      }
    });
    setState((current) => ({ ...current, placements: nextPlacements }));
  }

  function assignGuest(guestId, tableId) {
    setState((current) => {
      const placements = { ...current.placements };
      if (tableId && isFull(tableId, guestId, placements)) {
        window.alert("Cette table a atteint sa capacité.");
        return current;
      }
      if (tableId) placements[guestId] = tableId;
      else delete placements[guestId];
      return { ...current, placements };
    });
  }

  function clearPlan() {
    if (!window.confirm("Retirer toutes les affectations aux tables ?")) return;
    setState((current) => ({ ...current, placements: {} }));
  }

  const tabs = [
    ["event", "Événement"],
    ["guests", "Invités"],
    ["tables", "Tables"],
    ["plan", "Plan de salle"],
  ];

  return (
    <>
      <header className="site-header">
        <div>
          <div className="brand">NANA <span>INVITATION</span></div>
          <div className="tagline">La gestion élégante de vos événements</div>
        </div>
        <div className="tagline">Votre espace d’organisation</div>
      </header>

      <main className="container">
        <div className="intro">
          <div>
            <h1>Votre espace événement</h1>
            <p>Préparez vos invités et organisez les places de vos tables.</p>
          </div>
          <button className="button gold no-print" onClick={() => window.print()}>
            Imprimer le plan de salle
          </button>
        </div>

        <nav className="tabs no-print" aria-label="Sections de l’application">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={`tab ${activeTab === id ? "active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeTab === "event" && (
          <section className="panel">
            <h2>Informations de l’événement</h2>
            <p>Renseignez les informations principales de votre cérémonie.</p>
            <form className="form-grid top-space" onSubmit={saveEvent}>
              <Field label="Nom de l’événement">
                <input value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })} placeholder="Ex. Mariage de ..." />
              </Field>
              <Field label="Type d’événement">
                <select value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}>
                  {["Mariage", "Anniversaire", "Baptême", "Conférence", "Réception", "Autre"].map((v) => <option key={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Date">
                <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} />
              </Field>
              <Field label="Lieu">
                <input value={eventForm.place} onChange={(e) => setEventForm({ ...eventForm, place: e.target.value })} placeholder="Ville, salle ou adresse" />
              </Field>
              <Field label="Note / thème" full>
                <textarea rows="3" value={eventForm.note} onChange={(e) => setEventForm({ ...eventForm, note: e.target.value })} placeholder="Thème, couleurs, consignes..." />
              </Field>
              <div className="full"><button className="button" type="submit">Enregistrer l’événement</button></div>
            </form>
          </section>
        )}

        {activeTab === "guests" && (
          <section className="panel">
            <h2>Gestion des invités</h2>
            <p>Ajoutez les personnes invitées et suivez leur présence.</p>
            <div className="stats">
              <Stat label="Invités enregistrés" value={state.guests.length} />
              <Stat label="Présences confirmées" value={confirmedCount} />
              <Stat label="Non confirmées" value={pendingCount} />
            </div>
            <form className="form-grid no-print" onSubmit={addGuest}>
              <Field label="Nom complet *">
                <input required value={guestForm.name} onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })} placeholder="Nom et prénom" />
              </Field>
              <Field label="Téléphone">
                <input type="tel" value={guestForm.phone} onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })} placeholder="6XX XX XX XX" />
              </Field>
              <Field label="Groupe / famille">
                <input value={guestForm.group} onChange={(e) => setGuestForm({ ...guestForm, group: e.target.value })} placeholder="Famille, amis, collègues..." />
              </Field>
              <Field label="Confirmation">
                <select value={guestForm.status} onChange={(e) => setGuestForm({ ...guestForm, status: e.target.value })}>
                  <option>En attente</option><option>Confirmé</option><option>Absent</option>
                </select>
              </Field>
              <div className="full"><button className="button" type="submit">Ajouter l’invité</button></div>
            </form>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nom</th><th>Téléphone</th><th>Groupe</th><th>Statut</th><th className="no-print">Action</th></tr></thead>
                <tbody>
                  {state.guests.map((guest) => (
                    <tr key={guest.id}>
                      <td>{guest.name}</td><td>{guest.phone || "—"}</td><td>{guest.group || "—"}</td><td>{guest.status}</td>
                      <td className="no-print"><button className="button danger small" onClick={() => removeGuest(guest.id)}>Supprimer</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!state.guests.length && <Empty>Aucun invité pour le moment. Ajoutez votre premier invité ci-dessus.</Empty>}
            </div>
          </section>
        )}

        {activeTab === "tables" && (
          <section className="panel">
            <h2>Configuration des tables</h2>
            <p>Définissez le nombre de tables et la capacité de chacune.</p>
            <div className="hint">La capacité est personnalisable : vous pouvez attribuer un nombre de places différent à chaque table.</div>
            <form className="form-grid no-print" onSubmit={addTable}>
              <Field label="Nom de la table">
                <input required value={tableForm.name} onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })} placeholder="Ex. Table 1" />
              </Field>
              <Field label="Nombre de places">
                <input required type="number" min="1" max="100" value={tableForm.capacity} onChange={(e) => setTableForm({ ...tableForm, capacity: e.target.value })} />
              </Field>
              <div className="full"><button className="button" type="submit">Ajouter la table</button></div>
            </form>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Table</th><th>Capacité</th><th className="no-print">Action</th></tr></thead>
                <tbody>
                  {state.tables.map((table) => (
                    <tr key={table.id}>
                      <td>{table.name}</td><td>{table.capacity} places</td>
                      <td className="no-print"><button className="button danger small" onClick={() => removeTable(table.id)}>Supprimer</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!state.tables.length && <Empty>Aucune table configurée. Ajoutez votre première table.</Empty>}
            </div>
          </section>
        )}

        {activeTab === "plan" && (
          <section className="panel" id="print-plan">
            <h2>Plan de salle</h2>
            <p>Choisissez un placement automatique ou affectez les invités manuellement.</p>
            <div className="stats">
              <Stat label="Places disponibles" value={seatTotal} />
              <Stat label="Invités placés" value={placedGuests.length} />
              <Stat label="Invités sans place" value={unplacedGuests.length} />
            </div>
            <div className="actions no-print">
              <button className="button" onClick={automaticPlacement}>Placement automatique</button>
              <button className="button secondary" onClick={clearPlan}>Vider les placements</button>
            </div>
            <div className="hint">Le placement automatique répartit les invités confirmés puis les invités en attente dans les places disponibles. Les invités déclarés absents ne sont pas placés.</div>

            {eligibleGuests.length > 0 && (
              <div className="manual-area no-print">
                <h3>Placement manuel</h3>
                <p>Choisissez une table pour chaque invité.</p>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Invité</th><th>Statut</th><th>Table attribuée</th></tr></thead>
                    <tbody>
                      {eligibleGuests.map((guest) => (
                        <tr key={guest.id}>
                          <td>{guest.name}</td><td>{guest.status}</td>
                          <td>
                            <select value={state.placements[guest.id] || ""} onChange={(e) => assignGuest(guest.id, e.target.value)}>
                              <option value="">Sans table</option>
                              {state.tables.map((table) => {
                                const occupied = Object.values(state.placements).filter((id) => id === table.id).length;
                                return <option key={table.id} value={table.id}>{table.name} ({Math.max(0, occupied - (state.placements[guest.id] === table.id ? 1 : 0))}/{table.capacity})</option>;
                              })}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="table-cards">
              {state.tables.map((table) => {
                const members = state.guests.filter((guest) => state.placements[guest.id] === table.id);
                return (
                  <article className="table-card" key={table.id}>
                    <h3>{table.name}</h3>
                    <div className="muted">{members.length} / {table.capacity} places occupées</div>
                    {members.length ? members.map((guest) => (
                      <div className="seat" key={guest.id}><span>{guest.name}</span><span className="muted">{guest.status}</span></div>
                    )) : <p className="muted top-space">Aucun invité affecté</p>}
                  </article>
                );
              })}
            </div>
            {!state.tables.length && !state.guests.length && <Empty>Configurez vos tables et ajoutez des invités pour commencer le plan de salle.</Empty>}
            {state.tables.length > 0 && state.guests.length === 0 && <Empty>Ajoutez des invités pour commencer le plan de salle.</Empty>}
          </section>
        )}
      </main>
      <footer>NANA INVITATION · Version de démarrage — données enregistrées sur cet appareil.</footer>
    </>
  );
}

function Field({ label, full = false, children }) {
  return <label className={`field ${full ? "full" : ""}`}><span>{label}</span>{children}</label>;
}
function Stat({ label, value }) {
  return <div className="stat"><span className="muted">{label}</span><strong>{value}</strong></div>;
}
function Empty({ children }) {
  return <div className="empty">{children}</div>;
}
