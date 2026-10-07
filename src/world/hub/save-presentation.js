const titles={loading:'Ouverture de ta sauvegarde',saving:'Synchronisation en cours',synced:'Progression liée à ton compte',local:'Progression conservée sur cet appareil',new:'Partie invitée sur cet appareil',pending:'Actions en attente de synchronisation',offline:'Connexion à la sauvegarde indisponible',auth:'Reconnexion au compte nécessaire',receipt:'Confirmation du serveur attendue',storage:'Stockage de cet appareil indisponible'};
export function savePresentation(status={}){
 const outcome=status.outcome||'loading',pendingCount=Math.max(0,Math.trunc(Number(status.pendingCount)||0));
 const needsAttention=['offline','auth','receipt','storage'].includes(outcome);
 const detail=outcome==='storage'?'Télécharge une copie avant de fermer le monde.':outcome==='auth'?'Tes actions conservées sur cet appareil seront envoyées après ta reconnexion.':needsAttention?(status.hasLocalCopy?'La copie locale reste disponible. Le monde réessaiera au retour du réseau.':'Aucune copie locale retrouvée. Reconnecte-toi avant de commencer une autre progression.'):
 status.scope==='device'?'Cette partie reste sur ce navigateur. Télécharge une copie pour la conserver.':outcome==='synced'?'Les actions envoyées ont été confirmées par le serveur.':'Tu peux continuer : les actions enregistrées seront envoyées au compte.';
 return {title:titles[outcome]||titles.pending,detail,pendingCount,needsAttention,tone:outcome==='storage'?'error':needsAttention?'warning':['synced','local'].includes(outcome)?'success':'normal'};
}
