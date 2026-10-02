export const GOLD_MASTER_VERSION="1.0.0";
export const goldMasterTokens=Object.freeze({
 colors:Object.freeze({obsidian:"#050607",carbon:"#0B0D0F",champagne:"#D6BC82",champagneHighlight:"#F0DDAF",matrix:"#3BA7FF",success:"#35C98B",warning:"#E6A84B",danger:"#F15B64",text:"#F3EFE6"}),
 spacing:Object.freeze([4,8,12,16,24,32,48,64]),
 radii:Object.freeze({control:8,field:12,card:16,hero:24}),
 motion:Object.freeze({micro:160,card:250,screen:380}),
 typography:Object.freeze({display:"Sora, Inter, ui-sans-serif, system-ui, sans-serif",interface:"Inter, ui-sans-serif, system-ui, sans-serif"})
});
export const GOLD_MASTER_STATES=Object.freeze(["normal","hover","pressed","focus","disabled","loading","success","warning","error","offline","empty"]);

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
 sunWarm:'#ffbb81',dust:'#e3d5b7',bird:'#303b42',
 monumentStone:'#29353c',monumentGold:'#c9b486',monumentDark:'#121a20',monumentBlue:'#31729a',monumentEmission:'#53b9e5',
 platformGlass:'#071a27',platformEmission:'#009cff'
});
export const worldCrowdPalette=Object.freeze({
 base:'#ffffff',
 cloth:Object.freeze(['#23313d','#4b3547','#31483d','#5a4937','#263f54','#504d58','#6a4438','#2d2f35']),
 skin:Object.freeze(['#5c3928','#795039','#9b6b4b','#bd8966','#d6a583','#e4bd9c']),
});
