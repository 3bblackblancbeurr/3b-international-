import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Layers3, Shirt, Sparkles } from "lucide-react";
import "./ai.css";

function TextileBrief() {
  const [garment, setGarment] = useState("Hoodie");
  const [direction, setDirection] = useState("");
  const [brief, setBrief] = useState("");
  const [notice, setNotice] = useState("");
  function prepare(event) {
    event.preventDefault();
    if (!direction.trim()) return;
    setBrief(`Brief textile 3B International\n\nPièce : ${garment}\nDirection créative : ${direction.trim()}\n\nIdentité : BLACK • BLANC • BEUR. Noir profond, or 3B et bleu digital Matrix.\nRespecter les logos officiels et leur placement. Prévoir une vue de face, une vue de dos et les détails de matière et de finition.\n\nCe n’est pas une marque, c’est un héritage.`);
    setNotice("Ton brief est prêt. Tu peux le copier et le conserver.");
  }
  return <form className="premium-panel ai-brief" onSubmit={prepare}>
    <p className="eyebrow">Commence par ton idée</p>
    <h2>Prépare ton brief textile</h2>
    <p>Décris ta pièce et rassemble tes instructions. La création d’images par IA sera proposée prochainement.</p>
    <label className="form-line">Type de vêtement
      <select value={garment} onChange={event => setGarment(event.target.value)}>
        {["Hoodie", "T-shirt", "Veste", "Maillot", "Pantalon", "Accessoire"].map(item => <option key={item}>{item}</option>)}
      </select>
    </label>
    <label className="form-line">Ton idée
      <textarea required maxLength={2000} rows={4} value={direction} onChange={event => setDirection(event.target.value)}
        placeholder="Coupe, matière, couleurs, détails et emplacement du logo…" />
    </label>
    <button type="submit" className="primary-button">Préparer mon brief</button>
    {brief && <div className="ai-brief-result">
      <label className="form-line">Ton brief textile<textarea readOnly rows={10} value={brief} /></label>
      <button type="button" className="secondary-button" onClick={async () => {
        try { await navigator.clipboard.writeText(brief); setNotice("Brief copié."); }
        catch { setNotice("Sélectionne le texte du brief pour le copier sur ton appareil."); }
      }}>Copier le brief</button>
    </div>}
    <p className="ai-notice" role="status">{notice}</p>
  </form>;
}

export default function AiPage({ page, goTo }) {
  const textile = page === "ia-textile";
  const trio = page === "ia-trio";
  const detail = textile || trio;
  const title = textile ? "IA textile" : trio ? "Mode 3 IA" : "Espace IA";
  return <section className="page-section ai3b">
    <section className="page-header">
      <button type="button" className="ghost-button" onClick={() => goTo(detail ? "ia" : "home")}>
        <ArrowLeft size={16} aria-hidden="true" /> {detail ? "Espace IA" : "Retour"}
      </button>
      <div><p className="eyebrow">3B International · Studio créatif</p><h1>{title}</h1>
        <p>{textile ? "Imagine les prochaines pièces de ton héritage." : trio ? "Un même projet. Trois regards pour le faire avancer." : "Tes idées donnent le départ."}</p>
      </div>
    </section>
    {!detail && <div className="ai-grid">
      <article className="ai-card">
        <div className="ai-card-top"><Shirt size={40} strokeWidth={1.3} aria-hidden="true" /><span className="ai-status">Images IA · Prochainement</span></div>
        <p className="eyebrow">01 · Atelier 3B</p><h2>IA textile</h2>
        <p>Prépare tes futurs vêtements : coupes, matières, couleurs et détails. Commence dès maintenant par ton brief créatif.</p>
        <div className="ai-tags"><span>Vêtements</span><span>Matières</span><span>Identité 3B</span></div>
        <button type="button" className="secondary-button" onClick={() => goTo("ia-textile")}>Découvrir l’atelier <ArrowUpRight size={18} aria-hidden="true" /></button>
      </article>
      <article className="ai-card ai-card-trio">
        <div className="ai-card-top"><Layers3 size={40} strokeWidth={1.3} aria-hidden="true" /><span className="ai-status">Prochainement</span></div>
        <p className="eyebrow">02 · Intelligence collective</p><h2>Mode 3 IA</h2>
        <p>Un espace prévu pour interroger GPT, Claude et Gemini sur le même projet, comparer leurs réponses et préparer une synthèse.</p>
        <div className="ai-tags"><span>GPT</span><span>Claude</span><span>Gemini</span></div>
        <button type="button" className="secondary-button" onClick={() => goTo("ia-trio")}>Découvrir le Mode 3 IA <ArrowUpRight size={18} aria-hidden="true" /></button>
      </article>
    </div>}
    {textile && <TextileBrief />}
    {trio && <article className="premium-panel ai-trio-detail">
      <Sparkles size={36} strokeWidth={1.4} aria-hidden="true" />
      <p className="eyebrow">GPT · Claude · Gemini</p><h2>Trois IA autour de ton projet</h2>
      <ol className="ai-steps"><li><strong>Un brief commun</strong><p>Présenter ton idée et tes objectifs aux trois IA.</p></li>
        <li><strong>Trois réponses</strong><p>Lire et comparer leurs propositions dans le même espace.</p></li>
        <li><strong>Une synthèse</strong><p>Rassembler les pistes utiles pour choisir la suite.</p></li></ol>
      <p className="ai-coming-soon">Ce mode est en préparation. Les trois services IA ne sont pas encore connectés.</p>
    </article>}
  </section>;
}
