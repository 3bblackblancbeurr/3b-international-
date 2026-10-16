/**
 * Open Food Facts read-only proxy for the 3B ingredient scanner.
 * A barcode is the only input. No image, medical information or identity is sent.
 * Attribution: Open Food Facts (ODbL), https://world.openfoodfacts.org/
 */
const digitsOnly = value => typeof value==='string'&&/^\d{8,14}$/.test(value);
const compactText=(value,limit=300)=>typeof value==='string'?value.trim().slice(0,limit):'';
const nutrient=(data,key)=>{
  const n=data?.[key];return typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;
};
const safeTags=(tags)=>Array.isArray(tags)?tags.filter(v=>typeof v==='string').slice(0,30).map(v=>v.slice(0,70)):[];
export default async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET')return res.status(405).json({error:'Méthode non autorisée'});
  const code=typeof req.query?.code==='string'?req.query.code:'';
  if(!digitsOnly(code))return res.status(400).json({error:'Code-barres invalide'});
  try{
    const fields='code,product_name,product_name_fr,brands,quantity,ingredients_text,ingredients_text_fr,allergens_tags,traces_tags,nutriscore_grade,nova_group,nutriments';
    const url='https://world.openfoodfacts.org/api/v2/product/'+code+'.json?fields='+encodeURIComponent(fields);
    const upstream=await fetch(url,{
      headers:{'Accept':'application/json','User-Agent':'3B-International-Food-Scanner/1.0 (https://3b-international.vercel.app; contact: 3bblackblancbeurr@gmail.com)'},
      signal:AbortSignal.timeout(8000),redirect:'error',
    });
    if(!upstream.ok)throw new Error('OFF unavailable');
    const body=await upstream.json();
    if(body.status!==1||!body.product){
      res.setHeader('Cache-Control','public, s-maxage=600, stale-while-revalidate=600');
      return res.status(404).json({error:'Produit non référencé dans Open Food Facts'});
    }
    const p=body.product,n=p.nutriments||{},score=compactText(p.nutriscore_grade,3).toUpperCase();
    const product={
      code, name:compactText(p.product_name_fr||p.product_name,160)||'Produit sans nom renseigné',
      brand:compactText(p.brands,100),quantity:compactText(p.quantity,60),
      ingredients:compactText(p.ingredients_text_fr||p.ingredients_text,1500),
      allergens:safeTags(p.allergens_tags),traces:safeTags(p.traces_tags),
      nutriscore:/^[A-E]$/.test(score)?score:null,
      nova:[1,2,3,4].includes(p.nova_group)?p.nova_group:null,
      per100g:{
        kcal:nutrient(n,'energy-kcal_100g'),sugars:nutrient(n,'sugars_100g'),
        salt:nutrient(n,'salt_100g'),fat:nutrient(n,'fat_100g'),
        saturated:nutrient(n,'saturated-fat_100g'),fiber:nutrient(n,'fiber_100g'),
        proteins:nutrient(n,'proteins_100g'),
      },
    };
    res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({product,source:'Open Food Facts',url:'https://world.openfoodfacts.org/product/'+code});
  }catch{
    res.setHeader('Cache-Control','no-store');
    return res.status(503).json({error:'Base alimentaire momentanément inaccessible'});
  }
}
