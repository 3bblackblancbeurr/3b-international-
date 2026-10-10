export const GOLD_MASTER_VERSION="1.1.0";
export const goldMasterTokens=Object.freeze({
 // Saturated gold, a warm specular highlight and a bronze edge share one material family.
 colors:Object.freeze({obsidian:"#050607",carbon:"#0B0D0F",champagne:"#E8B84D",champagneHighlight:"#FFE6A3",champagneDeep:"#B98528",goldInk:"#18140D",matrix:"#3BA7FF",success:"#35C98B",warning:"#E6A84B",danger:"#F15B64",text:"#F3EFE6"}),
 spacing:Object.freeze([4,8,12,16,24,32,48,64]),
 radii:Object.freeze({control:8,field:12,card:16,hero:24}),
 motion:Object.freeze({micro:160,card:250,screen:380}),
 typography:Object.freeze({display:"Sora, Inter, ui-sans-serif, system-ui, sans-serif",interface:"Inter, ui-sans-serif, system-ui, sans-serif"})
});
export const GOLD_MASTER_STATES=Object.freeze(["normal","hover","pressed","focus","disabled","loading","success","warning","error","offline","empty"]);

// Bright catalogue backdrop keeps every building readable independently of world lighting.
export const cityPreviewArt=Object.freeze({
 skyTop:'#edf5f6',skyMiddle:'#c7dbdd',skyBottom:'#9ab6b1',contactShadow:'#243e4430'
});

// Physical scene palettes share the same reviewed design-system source as UI tokens.
export const worldRealmArt=Object.freeze({
 hub:{sun:'#ffe2bb',sky:'#aecddd',ground:'#43464b',fog:'#aebbc4',night:'#101d30',stone:'#363d43',cloth:'#344e5c'},
 france:{sun:'#fff0d6',sky:'#b9d5e6',ground:'#62646a',fog:'#bdcbd2',night:'#122035',stone:'#d3c5ac',cloth:'#334d69'},
 algerie:{sun:'#ffe0af',sky:'#b2cbd4',ground:'#89735c',fog:'#d9c7a7',night:'#202b39',stone:'#dfd6bf',cloth:'#316c5d'},
 maroc:{sun:'#ffd4a0',sky:'#a9c2d0',ground:'#755943',fog:'#cbb391',night:'#202035',stone:'#bd8767',cloth:'#346b65'},
 tunisie:{sun:'#fff1d4',sky:'#a7d9e5',ground:'#768d90',fog:'#c7dce0',night:'#122939',stone:'#eee5d3',cloth:'#2b638d'},
 espagne:{sun:'#ffd8b3',sky:'#bfc8dd',ground:'#827064',fog:'#d7bca6',night:'#282235',stone:'#d3b58b',cloth:'#a14f43'},
 italie:{sun:'#ffe7c1',sky:'#b6d5df',ground:'#7d7860',fog:'#d8cdb5',night:'#192b34',stone:'#d2b489',cloth:'#467365'},
 turquie:{sun:'#ffdfbb',sky:'#c2c6de',ground:'#786978',fog:'#c4bbce',night:'#211d36',stone:'#c9b898',cloth:'#6c4e74'},
 estonie:{sun:'#edf2e2',sky:'#b2d7e8',ground:'#546c70',fog:'#aacbd1',night:'#0e263b',stone:'#c0c7ba',cloth:'#446a72'},
});
export const worldArtMaterials=Object.freeze({
 sunWarm:'#ffbb81',dust:'#e3d5b7',bird:'#303b42',travellerMetal:'#c9ad75',
 monumentStone:'#29353c',monumentGold:'#c9b486',monumentDark:'#121a20',monumentBlue:'#31729a',monumentEmission:'#53b9e5',
 platformGlass:'#071a27',platformEmission:'#009cff'
});
export const worldCrowdPalette=Object.freeze({
 base:'#ffffff',
 cloth:Object.freeze(['#23313d','#4b3547','#31483d','#5a4937','#263f54','#504d58','#6a4438','#2d2f35']),
 skin:Object.freeze(['#5c3928','#795039','#9b6b4b','#bd8966','#d6a583','#e4bd9c']),
});

// Accepted combat feedback and danger shapes share the reviewed world palette.
export const worldCombatArt=Object.freeze({
 enemyRealms:Object.freeze({france:'#efc66e',italie:'#ec9970',estonie:'#8bdbed',turquie:'#baa2f2',algerie:'#ecc68a',tunisie:'#79d5e2',maroc:'#e99875',espagne:'#dfbb74'}),
 enemyDefault:'#dc9b9b',injury:'#ffb69c',guardSpark:'#edfaff',
 slash:'#fff2cf',echo:'#f0d28f',projectile:'#efd58f',outgoingImpact:'#fff3d6',guardInner:'#94def0',guardOuter:'#badfef',enemyAttack:'#eaaa83',
 stormBolt:'#a6e4ff',stormCore:'#d7f5ff',stormGlow:'#84cce5',impactParticle:'#fbe4b2',healing:'#a9de98',trap:'#dbacfb',shield:'#9edeee',
 dangerFill:'#ef8658',strikeEdge:'#ffc49e',areaEdge:'#ef9c69',intentRune:'#ade2cd',windupGauge:'#ffe4be',
 healingArea:'#84e4ad',shieldArea:'#8cceeb',areaIntent:'#efa86f',
});

// Cartographic pigments preserve the authored terrain, landmark and route contrast.
// They are illustration tokens; interactive chrome uses the --3b-* CSS tokens.
export const worldCartographyArt=Object.freeze({
 water:'#267f98',reef:'#29444e',relief:'#385960',waterEdge:'#75c6d4',reliefEdge:'#829d94',featureEdge:'#729a9f',
 raisedPlatform:'#aba88a',raisedPlatformEdge:'#f2d599',platformEdge:'#d0b883',platformFallback:'#8f9990',rampEdge:'#f0dca0',
 networkUnderlay:'#071e30',train:'#ffd367',boat:'#60d4f8',telepheric:'#f29ecb',zipline:'#9ee97f',shuttle:'#77b5fc',
 landmarkMarker:'#3b3b32',marker:'#102c40',markerDone:'#8aac8f',markerEdge:'#e9cca0',markerText:'#fff0cd',
 cameraCone:'#c6ebf72e',destinationAccent:'#d5bb8b',landmarkAccent:'#dac596',landmarkGarden:'#64855c',landmarkSite:'#a79b76',
});

// Shared by the service swatches, saved presets and their physical 3D preview.
export const hubServiceArt=Object.freeze({
 heritageBase:'#101a26',matrixBase:'#14354a',matrixAccent:'#00a8ff',solarBase:'#e6ded0',solarAccent:'#d2a451',gardenBase:'#264b3e',gardenAccent:'#d9c78a',cabin:'#ce88b5',
 studio:'#0b1420',skyLight:'#d9edff',groundLight:'#132033',keyLight:'#fff1d6',rimLight:'#74c9ff',sample:'#ffffff',floor:'#172533',
});
