import { useEffect, useState } from "react";
import { CheckCircle2, Gift, LockKeyhole, MapPin, PackageCheck, ShieldCheck } from "lucide-react";
import { useLoyalty } from "../loyalty/LoyaltyContext.jsx";
import { secretClaimRequest } from "./secretClaimClient.js";

const EMPTY_FORM = {
  code: "",
  recipientName: "",
  hoodieSize: "",
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "France",
};

export default function PrizeClaim({ unlocked, goTo }) {
  const account = useLoyalty();
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState({ loading: false, claimed: false, winnerRank: null });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setForm((current) => ({
      ...current,
      recipientName: current.recipientName || account.profile?.name || "",
      country: current.country || account.profile?.country || "France",
    }));
  }, [account.profile?.name, account.profile?.country]);

  useEffect(() => {
    let live = true;
    if (!account.user) {
      setStatus({ loading: false, claimed: false, winnerRank: null });
      return () => { live = false; };
    }

    setStatus((current) => ({ ...current, loading: true }));
    secretClaimRequest({ expectedUserId: account.user.id })
      .then((result) => {
        if (!live) return;
        setStatus({
          loading: false,
          claimed: Boolean(result.claimed),
          winnerRank: result.winnerRank || null,
        });
      })
      .catch(() => {
        if (live) setStatus((current) => ({ ...current, loading: false }));
      });

    return () => { live = false; };
  }, [account.user?.id]);

  function field(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    setError("");
    setNotice("");
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || !account.user) return;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await secretClaimRequest({
        method: "POST",
        expectedUserId: account.user.id,
        body: form,
      });
      setStatus({ loading: false, claimed: true, winnerRank: result.winnerRank || null });
      setNotice(result.message || "Ton lot a bien été enregistré.");
      setForm((current) => ({
        ...EMPTY_FORM,
        recipientName: account.profile?.name || "",
        country: account.profile?.country || current.country || "France",
      }));
    } catch (submitError) {
      setError(submitError.message || "Impossible d'enregistrer le lot pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="secret3b-panel secret3b-claim" aria-labelledby="secret3b-claim-title">
      <div className="secret3b-claim-heading">
        <div className="secret3b-claim-icon" aria-hidden="true"><Gift size={24} /></div>
        <div>
          <p className="eyebrow">LOT SECRET 3B</p>
          <h2 id="secret3b-claim-title">Réclamer mon pull</h2>
          <p>Cette étape sert uniquement aux gagnants qui ont reçu un code à 8 chiffres pendant l'appel.</p>
        </div>
      </div>

      {!unlocked && !status.claimed && (
        <div className="secret3b-claim-locked">
          <LockKeyhole size={18} />
          <span>La réclamation s'ouvrira après la dernière transmission.</span>
        </div>
      )}

      {status.loading && <p className="secret3b-claim-status" role="status">Vérification de ton compte 3B…</p>}

      {status.claimed ? (
        <div className="secret3b-claim-success" role="status">
          <PackageCheck size={30} />
          <div>
            <strong>Pull gagnant enregistré{status.winnerRank ? ` · gagnant n°${status.winnerRank}` : ""}</strong>
            <p>Les informations de livraison ont été enregistrées. Conserve ton code gagnant jusqu'à réception du lot.</p>
          </div>
        </div>
      ) : unlocked && !account.user ? (
        <div className="secret3b-claim-login">
          <ShieldCheck size={22} />
          <div>
            <strong>Connexion requise</strong>
            <p>Le code gagnant doit être rattaché à un compte 3B pour empêcher qu'il soit utilisé deux fois.</p>
            <button type="button" className="secret3b-call-button" onClick={() => goTo?.("member")}>Me connecter à mon compte 3B</button>
          </div>
        </div>
      ) : unlocked && account.user ? (
        <form className="secret3b-claim-form" onSubmit={submit}>
          <div className="secret3b-claim-grid">
            <label className="secret3b-field secret3b-field-wide">
              <span>Code gagnant</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                pattern="[0-9]{8}"
                required
                value={form.code}
                onChange={(event) => field("code", event.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="8 chiffres"
              />
              <small>Le code entendu pendant l'appel. Il n'est jamais enregistré en clair.</small>
            </label>

            <label className="secret3b-field">
              <span>Nom du destinataire</span>
              <input
                type="text"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
                value={form.recipientName}
                onChange={(event) => field("recipientName", event.target.value)}
              />
            </label>

            <label className="secret3b-field">
              <span>Taille du pull</span>
              <input
                type="text"
                autoComplete="off"
                maxLength={16}
                required
                value={form.hoodieSize}
                onChange={(event) => field("hoodieSize", event.target.value.toUpperCase())}
                placeholder="Ex. M"
              />
            </label>

            <label className="secret3b-field secret3b-field-wide">
              <span>Adresse</span>
              <input
                type="text"
                autoComplete="address-line1"
                minLength={3}
                maxLength={160}
                required
                value={form.addressLine1}
                onChange={(event) => field("addressLine1", event.target.value)}
                placeholder="Numéro et rue"
              />
            </label>

            <label className="secret3b-field secret3b-field-wide">
              <span>Complément d'adresse <em>facultatif</em></span>
              <input
                type="text"
                autoComplete="address-line2"
                maxLength={160}
                value={form.addressLine2}
                onChange={(event) => field("addressLine2", event.target.value)}
                placeholder="Bâtiment, étage…"
              />
            </label>

            <label className="secret3b-field">
              <span>Code postal</span>
              <input
                type="text"
                autoComplete="postal-code"
                maxLength={24}
                required
                value={form.postalCode}
                onChange={(event) => field("postalCode", event.target.value)}
              />
            </label>

            <label className="secret3b-field">
              <span>Ville</span>
              <input
                type="text"
                autoComplete="address-level2"
                maxLength={100}
                required
                value={form.city}
                onChange={(event) => field("city", event.target.value)}
              />
            </label>

            <label className="secret3b-field secret3b-field-wide">
              <span>Pays</span>
              <input
                type="text"
                autoComplete="country-name"
                maxLength={80}
                required
                value={form.country}
                onChange={(event) => field("country", event.target.value)}
              />
            </label>
          </div>

          {error && <p className="secret3b-claim-message error" role="alert">{error}</p>}
          {notice && <p className="secret3b-claim-message success" role="status"><CheckCircle2 size={16} /> {notice}</p>}

          <div className="secret3b-claim-footer">
            <p><MapPin size={15} /> Les coordonnées sont utilisées pour gérer et expédier le lot. Elles ne sont pas stockées dans le brouillon du téléphone secret.</p>
            <button type="submit" className="secret3b-call-button" disabled={busy || form.code.length !== 8}>
              {busy ? "Vérification…" : "Valider mon code et mon adresse"}
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
