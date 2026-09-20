# Matrice Unreal

| Besoin 3B | Système cible |
|---|---|
| Grande métropole | World Partition |
| Quartiers | Data Layers + World Partition |
| Routes / parcelles | PCG + Houdini |
| Bâtiments détaillés | Nanite lorsque compatible |
| Distance | HLOD + culling |
| Population secondaire | Mass |
| VFX Matrix / pluie / pouvoirs | Niagara |
| Cinématiques | Sequencer |
| Personnages / poses | Control Rig |
| Matériaux | Substance + Material Instances |
| Sauvegarde distante | Supabase via Edge Functions |
| Ville personnelle | niveau/instance construit depuis snapshot serveur |

## Règle

Chaque système doit avoir un fallback moins coûteux. La qualité visuelle ne doit jamais empêcher un profil de performance stable.
