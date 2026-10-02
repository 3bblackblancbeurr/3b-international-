// Original owner artwork, delivered at its native definition. Crops are display
// windows only: no garment, logo, stitch or product specification is generated.
export const SHOP_MEDIA = Object.freeze([
  { src: '/shop/pull-3b-noir-hd.webp', width: 1229, height: 1536, light: 'obsidian',
    alt: 'Visuel de présentation du pull 3B International noir, monogramme ton sur ton',
    crop: { x: 128, y: 8, width: 970, height: 946 } },
  { src: '/shop/pull-3b-blanc-hd.webp', width: 1122, height: 1402, light: 'obsidian',
    alt: 'Huit motifs 3B issus du visuel original de la collection',
    crop: { x: 18, y: 1044, width: 1090, height: 229 } },
  { src: '/shop/pull-3b-blanc-hd.webp', width: 1122, height: 1402, light: 'pearl',
    alt: 'Visuel de présentation du pull 3B International blanc, monogramme ton sur ton',
    crop: { x: 116, y: 0, width: 890, height: 876 } },
]);

export function presentationCrop(media) {
  const crop = media.crop;
  return { frame: { aspectRatio: `${crop.width} / ${crop.height}` },
    image: { width: `${media.width / crop.width * 100}%`, height: `${media.height / crop.height * 100}%`,
      left: `${-crop.x / crop.width * 100}%`, top: `${-crop.y / crop.height * 100}%` } };
}
